// Database locale SQLite — con migrazione automatica dalla Fase 1
import * as SQLite from 'expo-sqlite';
import { secureRandomCode, normalizeEmail } from '../utils/security';

const db = SQLite.openDatabaseSync('fuelshare.db');

// Esegue una modifica ignorando l'errore "già esistente" (utile per le migrazioni)
function safe(sql, params = []) {
  try { db.runSync(sql, params); } catch (e) { /* colonna/indice già presente */ }
}

export function initDatabase() {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,       -- SHA-256 del token (il token vero sta in SecureStore)
      created_at INTEGER NOT NULL,
      last_used_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event TEXT NOT NULL,                   -- login_ok, login_fail, password_changed, ...
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicle_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      fuel_type TEXT NOT NULL,
      tank_capacity REAL,
      declared_consumption REAL
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_owner_id INTEGER NOT NULL,
      model_id INTEGER,
      name TEXT NOT NULL,
      fuel_type TEXT NOT NULL,
      tank_capacity REAL,
      declared_consumption REAL,
      corrected_consumption REAL,
      km_initial REAL NOT NULL DEFAULT 0,
      share_code TEXT,                       -- codice di condivisione (null = privato)
      is_shared INTEGER NOT NULL DEFAULT 0,  -- 1 = condiviso
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_owner_id) REFERENCES users(id),
      FOREIGN KEY (model_id) REFERENCES vehicle_models(id)
    );

    CREATE TABLE IF NOT EXISTS vehicle_members (
      vehicle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',   -- 'owner' | 'member'
      removed_at TEXT,                       -- non null = rimosso dalla propria lista
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (vehicle_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      km_start REAL NOT NULL,
      km_end REAL NOT NULL,
      distance REAL NOT NULL,
      driving_mode TEXT NOT NULL DEFAULT 'Misto',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS refuels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      liters REAL NOT NULL,
      km_odometer REAL NOT NULL,
      price_per_liter REAL,                  -- facoltativo, per i calcoli in €
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // ---- Migrazioni dalla Fase 1 ----
  safe("ALTER TABLE vehicles ADD COLUMN share_code TEXT");
  safe("ALTER TABLE vehicles ADD COLUMN is_shared INTEGER NOT NULL DEFAULT 0");
  safe("ALTER TABLE refuels ADD COLUMN price_per_liter REAL");
  safe("CREATE UNIQUE INDEX IF NOT EXISTS idx_share_code ON vehicles(share_code)");
  // ---- Migrazioni Fase 4: sicurezza account ----
  safe("ALTER TABLE users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0");
  safe("ALTER TABLE users ADD COLUMN locked_until INTEGER NOT NULL DEFAULT 0");
  safe("ALTER TABLE users ADD COLUMN password_changed_at INTEGER");
  safe("ALTER TABLE users ADD COLUMN recovery_hash TEXT");
  safe("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)");
  safe("CREATE INDEX IF NOT EXISTS idx_events_user ON auth_events(user_id)");

  // Retrocompatibilità: i veicoli Fase 1 diventano membri "owner" di se stessi
  const mc = db.getFirstSync('SELECT COUNT(*) AS c FROM vehicle_members');
  if (mc.c === 0) {
    db.runSync(`INSERT OR IGNORE INTO vehicle_members (vehicle_id, user_id, role)
                SELECT id, user_owner_id, 'owner' FROM vehicles`);
  }

  // ---- Seed modelli auto (solo se vuoto) ----
  const count = db.getFirstSync('SELECT COUNT(*) AS c FROM vehicle_models');
  if (count.c === 0) {
    const models = [
      ['Opel Meriva (Modello A, 2006, 1.3 CDTI Diesel)', 'Diesel', 52, 4.9],
      ['Fiat Panda (2012, 1.2 Benzina)', 'Benzina', 35, 5.2],
      ['Fiat 500 (2015, 1.2 Benzina)', 'Benzina', 35, 5.1],
      ['Volkswagen Golf (2018, 1.6 TDI Diesel)', 'Diesel', 50, 4.5],
      ['Toyota Yaris Hybrid (2020)', 'Ibrida', 36, 4.0],
      ['Renault Clio (2019, 1.5 dCi Diesel)', 'Diesel', 45, 4.2],
      ['Tesla Model 3 (2021)', 'Elettrico', 60, 14.0],
      ['Ford Fiesta (2017, 1.0 EcoBoost Benzina)', 'Benzina', 42, 5.0],
      ['Suzuki Swift (2018, 1.0 Boosterjet Benzina)', 'Benzina', 37, 5.0],
      ['Dacia Duster (2020, 1.5 dCi Diesel)', 'Diesel', 50, 5.0],
    ];
    for (const m of models) {
      db.runSync('INSERT INTO vehicle_models (name, fuel_type, tank_capacity, declared_consumption) VALUES (?,?,?,?)', m);
    }
  }
}

// ---------- USERS ----------
// L'hash della password non esce mai dal database verso la UI: usa publicUser()
export function publicUser(u) {
  if (!u) return null;
  return { id: u.id, name: u.name, email: u.email, created_at: u.created_at, has_recovery: !!u.recovery_hash };
}
export function createUser(name, email, hash) {
  const res = db.runSync(
    'INSERT INTO users (name, email, password_hash, password_changed_at) VALUES (?,?,?,?)',
    [name, normalizeEmail(email), hash, Date.now()]);
  return db.getFirstSync('SELECT * FROM users WHERE id = ?', [res.lastInsertRowId]);
}
export function getUserByEmail(email) {
  return db.getFirstSync('SELECT * FROM users WHERE email = ?', [normalizeEmail(email)]);
}
export function getUserById(id) {
  return db.getFirstSync('SELECT * FROM users WHERE id = ?', [id]);
}
export function updateUserEmail(userId, newEmail) {
  const exists = getUserByEmail(newEmail);
  if (exists && exists.id !== userId) throw new Error('Email non disponibile.');
  db.runSync('UPDATE users SET email = ? WHERE id = ?', [normalizeEmail(newEmail), userId]);
  return getUserById(userId);
}
export function updateUserPassword(userId, newHash) {
  db.runSync(
    'UPDATE users SET password_hash = ?, password_changed_at = ?, failed_attempts = 0, locked_until = 0 WHERE id = ?',
    [newHash, Date.now(), userId]);
}
// Aggiorna l'hash (es. migrazione da SHA-256 a scrypt) senza toccare altro
export function upgradePasswordHash(userId, newHash) {
  db.runSync('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
}

export function setRecoveryHash(userId, hash) {
  db.runSync('UPDATE users SET recovery_hash = ? WHERE id = ?', [hash, userId]);
}

// ---------- ANTI BRUTE-FORCE ----------
export function registerFailedAttempt(userId, lockMsFn) {
  const u = getUserById(userId);
  const attempts = (u?.failed_attempts || 0) + 1;
  const lockedUntil = lockMsFn(attempts) > 0 ? Date.now() + lockMsFn(attempts) : 0;
  db.runSync('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?', [attempts, lockedUntil, userId]);
}
export function resetFailedAttempts(userId) {
  db.runSync('UPDATE users SET failed_attempts = 0, locked_until = 0 WHERE id = ?', [userId]);
}

// ---------- SESSIONI ----------
export function createSession(userId, tokenHash, absoluteMs) {
  const now = Date.now();
  db.runSync('DELETE FROM sessions WHERE expires_at < ?', [now]); // pulizia
  db.runSync('INSERT INTO sessions (user_id, token_hash, created_at, last_used_at, expires_at) VALUES (?,?,?,?,?)',
    [userId, tokenHash, now, now, now + absoluteMs]);
}
export function getSessionByHash(tokenHash) {
  return db.getFirstSync('SELECT * FROM sessions WHERE token_hash = ?', [tokenHash]);
}
export function touchSession(tokenHash) {
  db.runSync('UPDATE sessions SET last_used_at = ? WHERE token_hash = ?', [Date.now(), tokenHash]);
}
export function deleteSession(tokenHash) {
  db.runSync('DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
}
export function deleteSessionsForUser(userId, exceptHash = null) {
  if (exceptHash) db.runSync('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?', [userId, exceptHash]);
  else db.runSync('DELETE FROM sessions WHERE user_id = ?', [userId]);
}

// ---------- REGISTRO EVENTI DI SICUREZZA ----------
export function logAuthEvent(userId, event) {
  db.runSync('INSERT INTO auth_events (user_id, event, created_at) VALUES (?,?,?)', [userId, event, Date.now()]);
  // tieni solo gli ultimi 50 eventi per utente
  db.runSync(
    `DELETE FROM auth_events WHERE user_id = ? AND id NOT IN
     (SELECT id FROM auth_events WHERE user_id = ? ORDER BY id DESC LIMIT 50)`, [userId, userId]);
}
export function getAuthEvents(userId, limit = 10) {
  return db.getAllSync('SELECT event, created_at FROM auth_events WHERE user_id = ? ORDER BY id DESC LIMIT ?', [userId, limit]);
}

// ---------- VEHICLES & MEMBERS ----------
function deleteVehicleHard(vehicleId) {
  db.runSync('DELETE FROM trips WHERE vehicle_id = ?', [vehicleId]);
  db.runSync('DELETE FROM refuels WHERE vehicle_id = ?', [vehicleId]);
  db.runSync('DELETE FROM vehicle_members WHERE vehicle_id = ?', [vehicleId]);
  db.runSync('DELETE FROM vehicles WHERE id = ?', [vehicleId]);
}

export function createVehicle({ userOwnerId, modelId, name, fuelType, tankCapacity, declaredConsumption, kmInitial }) {
  const res = db.runSync(
    `INSERT INTO vehicles (user_owner_id, model_id, name, fuel_type, tank_capacity, declared_consumption, corrected_consumption, km_initial)
     VALUES (?,?,?,?,?,?,?,?)`,
    [userOwnerId, modelId, name, fuelType, tankCapacity, declaredConsumption, declaredConsumption, kmInitial]
  );
  db.runSync('INSERT INTO vehicle_members (vehicle_id, user_id, role) VALUES (?,?,?)', [res.lastInsertRowId, userOwnerId, 'owner']);
  return db.getFirstSync('SELECT * FROM vehicles WHERE id = ?', [res.lastInsertRowId]);
}

// Tutti i veicoli attivi dell'utente (privati + condivisi, esclusi i rimossi)
export function getVehiclesForUser(userId) {
  return db.getAllSync(
    `SELECT v.*, vm.role, vm.removed_at FROM vehicles v
     JOIN vehicle_members vm ON vm.vehicle_id = v.id
     WHERE vm.user_id = ? AND vm.removed_at IS NULL
     ORDER BY v.id DESC`, [userId]);
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// 8 caratteri generati con un generatore casuale sicuro (i vecchi codici da 6 restano validi)
function generateCode() {
  return secureRandomCode(CODE_ALPHABET, 8);
}

export function shareVehicle(vehicleId) {
  const v = db.getFirstSync('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);
  if (v.share_code) return v.share_code;
  let code = generateCode();
  while (db.getFirstSync('SELECT id FROM vehicles WHERE share_code = ?', [code])) code = generateCode();
  db.runSync("UPDATE vehicles SET share_code = ?, is_shared = 1 WHERE id = ?", [code, vehicleId]);
  return code;
}

export function joinVehicleByCode(code, userId) {
  const v = db.getFirstSync('SELECT * FROM vehicles WHERE share_code = ?', [code.trim().toUpperCase()]);
  if (!v) throw new Error('Codice non valido.');
  const existing = db.getFirstSync('SELECT * FROM vehicle_members WHERE vehicle_id = ? AND user_id = ?', [v.id, userId]);
  if (existing) {
    db.runSync('UPDATE vehicle_members SET removed_at = NULL WHERE vehicle_id = ? AND user_id = ?', [v.id, userId]);
  } else {
    db.runSync("INSERT INTO vehicle_members (vehicle_id, user_id, role) VALUES (?,?, 'member')", [v.id, userId]);
  }
  return v;
}

// Membri attivi di un veicolo (anche chi non ha ancora registrato nulla)
export function getVehicleMembers(vehicleId) {
  return db.getAllSync(
    `SELECT u.id, u.name, vm.role FROM vehicle_members vm
     JOIN users u ON u.id = vm.user_id
     WHERE vm.vehicle_id = ? AND vm.removed_at IS NULL ORDER BY vm.joined_at`, [vehicleId]);
}

// Rimuove un veicolo: i privati vengono ELIMINATI, i condivisi solo rimossi dalla lista
export function removeVehicle(vehicleId, userId) {
  const v = db.getFirstSync('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);
  if (!v) return;
  if (!v.is_shared) {
    deleteVehicleHard(vehicleId);
  } else {
    db.runSync("UPDATE vehicle_members SET removed_at = datetime('now') WHERE vehicle_id = ? AND user_id = ?", [vehicleId, userId]);
  }
}

// Elimina fisicamente i veicoli condivisi rimossi da TUTTI da più di 48 ore
export function cleanupDeletedSharedVehicles() {
  const rows = db.getAllSync(
    `SELECT v.id, MAX(vm.removed_at) AS last_removal,
            SUM(CASE WHEN vm.removed_at IS NULL THEN 1 ELSE 0 END) AS active_count
     FROM vehicles v JOIN vehicle_members vm ON vm.vehicle_id = v.id
     WHERE v.is_shared = 1 GROUP BY v.id`);
  const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  for (const r of rows) {
    if (r.active_count === 0 && r.last_removal && r.last_removal < cutoff) deleteVehicleHard(r.id);
  }
}

// ---------- TRIPS ----------
export function createTrip({ vehicleId, userId, date, kmStart, kmEnd, drivingMode }) {
  db.runSync(
    'INSERT INTO trips (vehicle_id, user_id, date, km_start, km_end, distance, driving_mode) VALUES (?,?,?,?,?,?,?)',
    [vehicleId, userId, date, kmStart, kmEnd, kmEnd - kmStart, drivingMode]);
}
export function getTripsByVehicle(vehicleId) {
  return db.getAllSync(
    `SELECT t.*, u.name AS user_name FROM trips t JOIN users u ON u.id = t.user_id
     WHERE t.vehicle_id = ? ORDER BY t.date DESC, t.id DESC`, [vehicleId]);
}
export function deleteTripsByIds(ids) {
  if (!ids.length) return;
  db.runSync(`DELETE FROM trips WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
}

// ---------- REFUELS ----------
export function createRefuel({ vehicleId, userId, date, liters, kmOdometer, pricePerLiter }) {
  db.runSync(
    'INSERT INTO refuels (vehicle_id, user_id, date, liters, km_odometer, price_per_liter) VALUES (?,?,?,?,?,?)',
    [vehicleId, userId, date, liters, kmOdometer, pricePerLiter ?? null]);

  // Correzione dinamica del consumo (media mobile 70/30)
  const prev = db.getFirstSync(
    'SELECT km_odometer FROM refuels WHERE vehicle_id = ? AND id < last_insert_rowid() ORDER BY id DESC LIMIT 1', [vehicleId]);
  if (prev) {
    const distance = kmOdometer - prev.km_odometer;
    if (distance > 0) {
      const actual = (liters * 100) / distance;
      const vehicle = db.getFirstSync('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);
      if (vehicle) {
        const corrected = vehicle.corrected_consumption * 0.7 + actual * 0.3;
        db.runSync('UPDATE vehicles SET corrected_consumption = ? WHERE id = ?', [corrected, vehicleId]);
      }
    }
  }
}
export function getRefuelsByVehicle(vehicleId) {
  return db.getAllSync(
    `SELECT r.*, u.name AS user_name FROM refuels r JOIN users u ON u.id = r.user_id
     WHERE r.vehicle_id = ? ORDER BY r.date DESC, r.id DESC`, [vehicleId]);
}
export function deleteRefuelsByIds(ids) {
  if (!ids.length) return;
  db.runSync(`DELETE FROM refuels WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
}

// ---------- IMPORT / CLEAR ----------
export function clearAllUserData(userId) {
  db.runSync('DELETE FROM trips WHERE user_id = ?', [userId]);
  db.runSync('DELETE FROM refuels WHERE user_id = ?', [userId]);
  const privates = db.getAllSync(
    `SELECT v.id FROM vehicles v JOIN vehicle_members vm ON vm.vehicle_id = v.id
     WHERE vm.user_id = ? AND v.is_shared = 0`, [userId]);
  for (const p of privates) deleteVehicleHard(p.id);
  // dagli shared non si cancella nulla: solo la propria membership
  db.runSync('DELETE FROM vehicle_members WHERE user_id = ? AND vehicle_id NOT IN (SELECT id FROM vehicles)', [userId]);
  db.runSync('DELETE FROM vehicle_members WHERE user_id = ? AND role != ?', [userId, 'owner']);
}

export function deleteUserAccount(userId) {
  clearAllUserData(userId);
  db.runSync('DELETE FROM vehicle_members WHERE user_id = ?', [userId]);
  db.runSync('DELETE FROM sessions WHERE user_id = ?', [userId]);
  db.runSync('DELETE FROM auth_events WHERE user_id = ?', [userId]);
  db.runSync('DELETE FROM users WHERE id = ?', [userId]);
}

export function getModels() {
  return db.getAllSync('SELECT * FROM vehicle_models ORDER BY name');
}

export default db;
