import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../components/Typo';
import PasswordField from '../components/PasswordField';
import StrengthMeter from '../components/StrengthMeter';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius } from '../theme';

const THEME_OPTIONS = [
  { key: 'light', label: 'Chiaro', icon: 'sunny-outline' },
  { key: 'dark', label: 'Scuro', icon: 'moon-outline' },
  { key: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
];

const EVENT_LABEL = {
  login_ok: 'Accesso effettuato', login_fail: 'Tentativo di accesso fallito', logout: 'Uscita dall\'account',
  register: 'Account creato', password_reset: 'Password reimpostata con codice', reset_fail: 'Recupero password fallito', recovery_regenerated: 'Nuovo codice di recupero', password_changed: 'Password cambiata', email_changed: 'Email cambiata',
};
const EVENT_ICON = {
  login_ok: 'log-in-outline', login_fail: 'warning-outline', logout: 'log-out-outline',
  register: 'person-add-outline', password_reset: 'key-outline', reset_fail: 'warning-outline', recovery_regenerated: 'refresh-outline', password_changed: 'key-outline', email_changed: 'mail-outline',
};

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, logout, changeEmail, changePassword, deleteAccount, securityEvents, regenerateRecoveryCode } = useApp();

  const [newEmail, setNewEmail] = useState('');
  const [emailPwd, setEmailPwd] = useState('');
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [delPwd, setDelPwd] = useState('');
  const [recPwd, setRecPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState(() => securityEvents());
  const refreshEvents = () => setEvents(securityEvents());

  // Esegue l'azione e mostra l'esito; ripulisce i campi solo se è andata a buon fine
  const run = async (fn, okMsg, onOk) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      if (onOk) onOk();
      if (okMsg) Alert.alert('Fatto', okMsg);
    } catch (e) {
      Alert.alert('Errore', e.message);
    } finally {
      setBusy(false);
      try { refreshEvents(); } catch (e) {}
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      {/* Info account */}
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Ionicons name="person-circle-outline" size={40} color={colors.accentText} />
          <View>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        </View>
      </View>

      {/* Aspetto */}
      <Text style={styles.sectionTitle}>Aspetto</Text>
      <View style={styles.themeRow}>
        {THEME_OPTIONS.map((o) => {
          const active = mode === o.key;
          return (
            <TouchableOpacity key={o.key} style={[styles.themeOption, active && styles.themeOptionActive]} onPress={() => setMode(o.key)} activeOpacity={0.8}>
              <Ionicons name={o.icon} size={20} color={active ? '#121417' : colors.textMuted} />
              <Text style={[styles.themeLabel, active && styles.themeLabelActive]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Cambio email */}
      <Text style={styles.sectionTitle}>Cambia email</Text>
      <View style={styles.card}>
        <TextInput style={styles.input} placeholder="Nuova email" placeholderTextColor={colors.textMuted} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" maxLength={254} value={newEmail} onChangeText={setNewEmail} />
        <PasswordField style={styles.pwdField} value={emailPwd} onChangeText={setEmailPwd} placeholder="Conferma con la tua password" />
        <TouchableOpacity style={styles.btn} onPress={() => run(() => changeEmail(newEmail, emailPwd), 'Email aggiornata.', () => { setNewEmail(''); setEmailPwd(''); })}>
          <Text style={styles.btnText}>Aggiorna email</Text>
        </TouchableOpacity>
      </View>

      {/* Cambio password */}
      <Text style={styles.sectionTitle}>Cambia password</Text>
      <View style={styles.card}>
        <PasswordField style={styles.pwdField} value={oldPwd} onChangeText={setOldPwd} placeholder="Password attuale" />
        <PasswordField style={styles.pwdField} value={newPwd} onChangeText={setNewPwd} placeholder="Nuova password" isNew />
        <StrengthMeter password={newPwd} />
        <TouchableOpacity style={styles.btn} onPress={() => run(() => changePassword(oldPwd, newPwd), 'Password aggiornata.', () => { setOldPwd(''); setNewPwd(''); })}>
          <Text style={styles.btnText}>Aggiorna password</Text>
        </TouchableOpacity>
      </View>

      {/* Recupero password */}
      <Text style={styles.sectionTitle}>Recupero password</Text>
      <View style={styles.card}>
        <Text style={styles.hint}>
          {user.has_recovery
            ? 'Hai un codice di recupero attivo. Se lo hai perso o lo hai condiviso, generane uno nuovo: quello vecchio smette subito di funzionare.'
            : 'Non hai ancora un codice di recupero: generalo ora, ti servirà se dimentichi la password.'}
        </Text>
        <PasswordField style={[styles.pwdField, { marginTop: spacing.sm }]} value={recPwd} onChangeText={setRecPwd} placeholder="Conferma con la tua password" />
        <TouchableOpacity style={styles.btn} onPress={() => run(() => regenerateRecoveryCode(recPwd), null, () => setRecPwd(''))}>
          <Text style={styles.btnText}>{user.has_recovery ? 'Genera nuovo codice' : 'Genera codice di recupero'}</Text>
        </TouchableOpacity>
      </View>

      {/* Attività di sicurezza */}
      <Text style={styles.sectionTitle}>Attività di sicurezza recente</Text>
      <View style={styles.card}>
        {events.length === 0 && <Text style={styles.email}>Nessuna attività registrata.</Text>}
        {events.map((e, i) => (
          <View key={i} style={styles.eventRow}>
            <Ionicons name={EVENT_ICON[e.event] || 'ellipse-outline'} size={16} color={(e.event === 'login_fail' || e.event === 'reset_fail') ? colors.red : colors.textMuted} />
            <Text style={[styles.eventText, (e.event === 'login_fail' || e.event === 'reset_fail') && { color: colors.red }]}>{EVENT_LABEL[e.event] || e.event}</Text>
            <Text style={styles.eventDate}>{new Date(e.created_at).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        ))}
        <Text style={styles.hint}>Se vedi accessi falliti che non riconosci, qualcuno ha provato a entrare sul tuo telefono: cambia la password.</Text>
      </View>

      {/* Sessione */}
      <Text style={styles.sectionTitle}>Sessione</Text>
      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]} onPress={logout}>
        <Text style={[styles.btnText, { color: colors.text }]}>Esci dall'account</Text>
      </TouchableOpacity>

      {/* Zona pericolosa */}
      <Text style={styles.sectionTitle}>Zona pericolosa</Text>
      <View style={styles.card}>
        <Text style={styles.hint}>Per eliminare l'account inserisci la tua password. Verranno cancellati account, veicoli privati e tutti i tuoi dati, in modo irreversibile.</Text>
        <PasswordField style={[styles.pwdField, { marginTop: spacing.sm }]} value={delPwd} onChangeText={setDelPwd} placeholder="Password" />
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.red }]}
          onPress={() => Alert.alert('Elimina account', 'Azione irreversibile. Sei sicuro?', [
            { text: 'Annulla', style: 'cancel' },
            { text: 'Elimina definitivamente', style: 'destructive', onPress: () => run(() => deleteAccount(delPwd)) },
          ])}
        >
          <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Elimina account e tutti i dati</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { color: colors.text, fontSize: 18, fontWeight: '800' },
  email: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  sectionTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  themeRow: { flexDirection: 'row', gap: spacing.sm },
  themeOption: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: radius.md,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  themeOptionActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  themeLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  themeLabelActive: { color: '#121417', fontWeight: '700' },
  input: {
    backgroundColor: colors.inputBg, color: colors.text, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 12, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border, fontSize: 15,
  },
  pwdField: { borderRadius: radius.sm, marginBottom: spacing.sm },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  eventText: { flex: 1, color: colors.text, fontSize: 13 },
  eventDate: { color: colors.textMuted, fontSize: 12 },
  btn: { borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', backgroundColor: colors.accent, marginTop: spacing.xs },
  btnText: { color: '#121417', fontWeight: '800', fontSize: 15 },
});
