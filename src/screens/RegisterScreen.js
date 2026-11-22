import { useMemo } from 'react';
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Text, TextInput } from '../components/Typo';
import PasswordField from '../components/PasswordField';
import StrengthMeter from '../components/StrengthMeter';
import { useApp } from '../context/AppContext';
import { spacing, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';

export default function RegisterScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { register } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const onRegister = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await register(name, email, password);
    } catch (e) {
      Alert.alert('Registrazione non riuscita', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Crea il tuo profilo</Text>
      <Text style={styles.subtitle}>I dati restano sul tuo telefono (offline).</Text>

      <TextInput style={styles.input} placeholder="Nome" placeholderTextColor={colors.textMuted} maxLength={60} autoComplete="name" textContentType="name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.textMuted} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="username" maxLength={254} value={email} onChangeText={setEmail} />
      <PasswordField value={password} onChangeText={setPassword} placeholder="Password" isNew />
      <StrengthMeter password={password} />

      <TouchableOpacity style={[styles.button, busy && { opacity: 0.6 }]} onPress={onRegister} disabled={busy}>
        {busy ? <ActivityIndicator color="#121417" /> : <Text style={styles.buttonText}>Registrati</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Hai già un account? <Text style={styles.linkBold}>Accedi</Text></Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: spacing.lg },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.xl },
  input: {
    backgroundColor: colors.inputBg, color: colors.text, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 14, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border, fontSize: 16,
  },
  button: {
    backgroundColor: colors.green, borderRadius: radius.md, paddingVertical: 15,
    alignItems: 'center', marginTop: spacing.sm,
  },
  buttonText: { color: '#121417', fontWeight: '800', fontSize: 16 },
  link: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  linkBold: { color: colors.green, fontWeight: '700' },
});
