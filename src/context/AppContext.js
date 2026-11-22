// Contesto globale: sessione, veicoli (privati + condivisi), dati, azioni
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  hashPassword, verifyPassword, needsRehash, dummyVerify, newSessionToken, sha256Hex,
  validateEmail, validateName, validatePassword, normalizeEmail, lockDurationMs,
  generateRecoveryCode, hashRecoveryCode, verifyRecoveryCode,
  SESSION_IDLE_MS, SESSION_ABSOLUTE_MS,
} from '../utils/security';
import {
  initDatabase, createUser, getUserByEmail, getUserById, publicUser,
  updateUserEmail, updateUserPassword, upgradePasswordHash,
  registerFailedAttempt, resetFailedAttempts,
  createSession, getSessionByHash, touchSession, deleteSession, deleteSessionsForUser,
  logAuthEvent, getAuthEvents, getVehicleMembers, setRecoveryHash,
  getVehiclesForUser, createVehicle, shareVehicle, joinVehicleByCode, removeVehicle,
  cleanupDeletedSharedVehicles,
  getTripsByVehicle, createTrip, getRefuelsByVehicle, createRefuel,
  deleteTripsByIds, deleteRefuelsByIds, clearAllUserData, deleteUserAccount, getModels,
} from '../db/database';

const AppContext = createContext(null);
const SESSION_KEY = 'fs_session_token';

export function AppProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [activeVehicleId, setActiveVehicleIdState] = useState(null);
  const [trips, setTrips] = useState([]);
  const [refuels, setRefuels] = useState([]);
  const [models, setModels] = useState([]);
  const [members, setMembers] = useState([]);
  const [pendingRecoveryCode, setPendingRecoveryCode] = useState(null);
  const sessionHash = useRef(null);

  useEffect(() => {
    initDatabase();
    setModels(getModels());
    (async () => {
      try {
        // Sessioni vecchie (solo id utente in chiaro): non più accettate, si rifà il login
        await AsyncStorage.removeItem('session_user_id');
        const lastV = await AsyncStorage.getItem('last_vehicle_id');
        const token = await SecureStore.getItemAsync(SESSION_KEY);
        if (token) {
          const h = await sha256Hex(token);
          const sess = getSessionByHash(h);
          const now = Date.now();
          if (sess && now < sess.expires_at && now - sess.last_used_at < SESSION_IDLE_MS) {
            const u = getUserById(sess.user_id);
            if (u) { sessionHash.current = h; touchSession(h); setUser(publicUser(u)); }
          } else {
            if (sess) deleteSession(h);
            await SecureStore.deleteItemAsync(SESSION_KEY);
          }
        }
        if (lastV) setActiveVehicleIdState(Number(lastV));
      } catch (e) {
        // se SecureStore o DB falliscono: nessuna sessione, si riparte dal login
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setActiveVehicleId = async (id) => {
    setActiveVehicleIdState(id);
    await AsyncStorage.setItem('last_vehicle_id', String(id));
  };

  // ---------- AUTH ----------
  const WRONG = 'Email o password non corretti.'; // messaggio unico: non rivela se l'email esiste

  const startSession = async (userId) => {
    const token = newSessionToken();
    const h = await sha256Hex(token);
    createSession(userId, h, SESSION_ABSOLUTE_MS);
    await SecureStore.setItemAsync(SESSION_KEY, token);
    sessionHash.current = h;
  };

  // Controlla la password di una riga utente con blocco temporaneo dopo troppi errori.
  // Usata sia dal login sia per riconfermare l'identità nelle azioni sensibili.
  const checkPassword = async (row, password, wrongMsg) => {
    if (row && row.locked_until > Date.now()) {
      const secs = Math.ceil((row.locked_until - Date.now()) / 1000);
      throw new Error(`Troppi tentativi. Riprova tra ${secs} secondi.`);
    }
    const ok = row ? await verifyPassword(String(password || ''), row.password_hash)
                   : (await dummyVerify(String(password || '')), false);
    if (!ok) {
      if (row) { registerFailedAttempt(row.id, lockDurationMs); logAuthEvent(row.id, 'login_fail'); }
      throw new Error(wrongMsg);
    }
    resetFailedAttempts(row.id);
    // aggiorna hash vecchi (SHA-256 delle fasi precedenti o parametri più deboli)
    if (needsRehash(row.password_hash)) upgradePasswordHash(row.id, await hashPassword(String(password)));
  };

  const login = async (email, password) => {
    const row = getUserByEmail(email);
    await checkPassword(row, password, WRONG);
    await startSession(row.id);
    logAuthEvent(row.id, 'login_ok');
    setUser(publicUser(row));
  };

  const register = async (name, email, password) => {
    const err = validateName(name) || validateEmail(email) || validatePassword(password, { email, name });
    if (err) throw new Error(err);
    if (getUserByEmail(email)) throw new Error('Impossibile registrare questa email. Prova ad accedere.');
    const row = createUser(name.trim(), normalizeEmail(email), await hashPassword(password));
    const code = generateRecoveryCode();
    setRecoveryHash(row.id, await hashRecoveryCode(code));
    await startSession(row.id);
    logAuthEvent(row.id, 'register');
    setPendingRecoveryCode(code); // l'app mostra il codice prima di entrare
    setUser(publicUser(getUserById(row.id)));
  };

  const logout = async () => {
    if (sessionHash.current) deleteSession(sessionHash.current);
    sessionHash.current = null;
    try { await SecureStore.deleteItemAsync(SESSION_KEY); } catch (e) {}
    if (user) logAuthEvent(user.id, 'logout');
    setUser(null); setPendingRecoveryCode(null); setVehicles([]); setActiveVehicleIdState(null); setTrips([]); setRefuels([]); setMembers([]);
    await AsyncStorage.removeItem('last_vehicle_id');
  };

  // Azioni sensibili: richiedono SEMPRE la password attuale (ri-autenticazione)
  const changeEmail = async (newEmail, password) => {
    await checkPassword(getUserById(user.id), password, 'Password errata.');
    const err = validateEmail(newEmail);
    if (err) throw new Error(err);
    const updated = updateUserEmail(user.id, newEmail);
    logAuthEvent(user.id, 'email_changed');
    setUser(publicUser(updated));
  };

  const changePassword = async (oldPassword, newPassword) => {
    const row = getUserById(user.id);
    await checkPassword(row, oldPassword, 'Password attuale errata.');
    if (oldPassword === newPassword) throw new Error('La nuova password deve essere diversa da quella attuale.');
    const err = validatePassword(newPassword, { email: row.email, name: row.name });
    if (err) throw new Error(err);
    updateUserPassword(user.id, await hashPassword(newPassword));
    deleteSessionsForUser(user.id, sessionHash.current); // chiude tutte le altre sessioni
    logAuthEvent(user.id, 'password_changed');
  };

  const deleteAccount = async (password) => {
    await checkPassword(getUserById(user.id), password, 'Password errata.');
    deleteSessionsForUser(user.id);
    deleteUserAccount(user.id);
    sessionHash.current = null;
    try { await SecureStore.deleteItemAsync(SESSION_KEY); } catch (e) {}
    setUser(null); setPendingRecoveryCode(null); setVehicles([]); setActiveVehicleIdState(null); setTrips([]); setRefuels([]); setMembers([]);
    await AsyncStorage.removeItem('last_vehicle_id');
  };

  // Nuovo codice di recupero (richiede la password): quello vecchio smette di funzionare
  const regenerateRecoveryCode = async (password) => {
    await checkPassword(getUserById(user.id), password, 'Password errata.');
    const code = generateRecoveryCode();
    setRecoveryHash(user.id, await hashRecoveryCode(code));
    logAuthEvent(user.id, 'recovery_regenerated');
    setUser(publicUser(getUserById(user.id)));
    setPendingRecoveryCode(code);
  };
  const ackRecoveryCode = () => setPendingRecoveryCode(null);

  // Password dimenticata: email + codice di recupero + nuova password. Restituisce il NUOVO codice.
  const resetPasswordWithCode = async (email, code, newPassword) => {
    const GENERIC = 'Email o codice di recupero non validi.';
    const row = getUserByEmail(email);
    if (row && row.locked_until > Date.now()) {
      throw new Error(`Troppi tentativi. Riprova tra ${Math.ceil((row.locked_until - Date.now()) / 1000)} secondi.`);
    }
    const err = validatePassword(newPassword, { email, name: row?.name || '' });
    if (err) throw new Error(err);
    const ok = await verifyRecoveryCode(code, row?.recovery_hash);
    if (!ok) {
      if (row) { registerFailedAttempt(row.id, lockDurationMs); logAuthEvent(row.id, 'reset_fail'); }
      throw new Error(GENERIC);
    }
    updateUserPassword(row.id, await hashPassword(newPassword)); // azzera anche i tentativi falliti
    deleteSessionsForUser(row.id);                               // esce da tutte le sessioni
    const fresh = generateRecoveryCode();
    setRecoveryHash(row.id, await hashRecoveryCode(fresh));
    logAuthEvent(row.id, 'password_reset');
    return fresh;
  };

  const securityEvents = () => (user ? getAuthEvents(user.id, 10) : []);

  // ---------- DATA ----------
  const refreshVehicles = useCallback(() => {
    if (!user) return;
    cleanupDeletedSharedVehicles();           // elimina i condivisi rimossi da tutti da >48h
    const list = getVehiclesForUser(user.id);
    setVehicles(list);
    if (list.length > 0 && !list.find((v) => v.id === activeVehicleId)) {
      setActiveVehicleIdState(list[0].id);
      AsyncStorage.setItem('last_vehicle_id', String(list[0].id));
    }
    if (list.length === 0) setActiveVehicleIdState(null);
  }, [user, activeVehicleId]);

  useEffect(() => { refreshVehicles(); }, [refreshVehicles]);

  const refreshData = useCallback(() => {
    if (!activeVehicleId) { setTrips([]); setRefuels([]); setMembers([]); return; }
    setTrips(getTripsByVehicle(activeVehicleId));
    setRefuels(getRefuelsByVehicle(activeVehicleId));
    setMembers(getVehicleMembers(activeVehicleId));
  }, [activeVehicleId]);

  useEffect(() => { refreshData(); }, [refreshData]);

  const addVehicle = (data) => { createVehicle({ ...data, userOwnerId: user.id }); refreshVehicles(); };
  const addTrip = (data) => { createTrip({ ...data, vehicleId: activeVehicleId, userId: user.id }); refreshData(); };
  const addRefuel = (data) => { createRefuel({ ...data, vehicleId: activeVehicleId, userId: user.id }); refreshVehicles(); refreshData(); };
  const doShareVehicle = (vehicleId) => shareVehicle(vehicleId);
  const doJoinByCode = (code) => { const v = joinVehicleByCode(code, user.id); refreshVehicles(); return v; };

  const doRemoveVehicle = (vehicleId) => { removeVehicle(vehicleId, user.id); refreshVehicles(); };

  const deleteSelected = (tripIds, refuelIds) => { deleteTripsByIds(tripIds); deleteRefuelsByIds(refuelIds); refreshData(); };
  const clearAll = () => { clearAllUserData(user.id); refreshVehicles(); refreshData(); };

  const importRows = (t, r) => {
    for (const x of t) createTrip({ ...x, vehicleId: activeVehicleId, userId: user.id });
    for (const x of r) createRefuel({ ...x, vehicleId: activeVehicleId, userId: user.id });
    refreshVehicles(); refreshData();
  };

  const activeVehicle = vehicles.find((v) => v.id === activeVehicleId) || null;

  return (
    <AppContext.Provider value={{
      loading, user, login, register, logout, changeEmail, changePassword, deleteAccount, securityEvents,
      pendingRecoveryCode, ackRecoveryCode, regenerateRecoveryCode, resetPasswordWithCode,
      vehicles, activeVehicle, activeVehicleId, setActiveVehicleId,
      addVehicle, doShareVehicle, doJoinByCode, doRemoveVehicle,
      trips, refuels, members, addTrip, addRefuel, refreshData,
      deleteSelected, clearAll, importRows, models,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() { return useContext(AppContext); }
