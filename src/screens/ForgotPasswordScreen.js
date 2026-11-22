// Recupero password: email + codice di recupero + nuova password
import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/Typo';
import PasswordField from '../components/PasswordField';
import StrengthMeter from '../components/StrengthMeter';
import RecoveryCodeBox from '../components/RecoveryCodeBox';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius } from '../theme';

export default function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { resetPasswordWithCode } = useApp();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [newCode, setNewCode] = useState(null);

  const onReset = async () => {
    if (busy) return;
    setBusy(true);
    try {
      setNewCode(await resetPasswordWithCode(email, code, pwd));
      setPwd(''); setCode('');
    } catch (e) {
      Alert.alert('Recupero non riuscito', e.message);
    } finally {
      setBusy(false);
    }
  };

  if (newCode) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Password aggiornata</Text>
        <Text style={styles.sub}>
          Il vecchio codice non vale più. Ecco il tuo NUOVO codice di recupero: salvalo, non verrà mostrato di nuovo.
        </Text>
        <RecoveryCodeBox code={newCode} />
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.buttonText}>Vai al login</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Password dimenticata</Text>
      <Text style={styles.sub}>
        Inserisci la tua email, il codice di recupero che hai ricevuto alla registrazione e scegli una nuova password.
      </Text>
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.textMuted} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" maxLength={254} value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Codice di recupero (XXXX-XXXX-…)" placeholderTextColor={colors.textMuted} autoCapitalize="characters" autoCorrect={false} spellCheck={false} maxLength={30} value={code} onChangeText={setCode} />
      <PasswordField value={pwd} onChangeText={setPwd} placeholder="Nuova password" isNew />
      <StrengthMeter password={pwd} />
      <TouchableOpacity style={[styles.button, busy && { opacity: 0.6 }]} onPress={onReset} disabled={busy}>
        {busy ? <ActivityIndicator color="#121417" /> : <Text style={styles.buttonText}>Reimposta password</Text>}
      </TouchableOpacity>
      <Text style={styles.note}>
        Hai perso anche il codice? Senza server non è possibile verificare la tua identità: l'account resta accessibile solo
        con la password. Con la sincronizzazione cloud (fase successiva) il recupero avverrà via email.
      </Text>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Torna al login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 70, paddingBottom: spacing.xl },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  sub: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.lg, lineHeight: 20 },
  input: { backgroundColor: colors.inputBg, color: colors.text, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, fontSize: 16 },
  button: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: spacing.sm },
  buttonText: { color: '#121417', fontWeight: '800', fontSize: 16 },
  note: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: spacing.lg, lineHeight: 18 },
  link: { color: colors.accentText, textAlign: 'center', marginTop: spacing.lg, fontWeight: '700' },
});
