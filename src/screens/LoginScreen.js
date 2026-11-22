import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/Typo';
import PasswordField from '../components/PasswordField';
import { useApp } from '../context/AppContext';
import { spacing, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const onLogin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await login(email, password);
    } catch (e) {
      setPassword('');
      Alert.alert('Accesso non riuscito', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.logoWrap}><Ionicons name="water" size={34} color="#121417" /></View>
      <Text style={styles.title}>FuelShare</Text>
      <Text style={styles.subtitle}>Dividi il carburante in litri, non in euro.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="username"
        maxLength={254}
        value={email}
        onChangeText={setEmail}
      />
      <PasswordField value={password} onChangeText={setPassword} placeholder="Password" />

      <TouchableOpacity style={[styles.button, busy && { opacity: 0.6 }]} onPress={onLogin} disabled={busy}>
        {busy ? <ActivityIndicator color="#121417" /> : <Text style={styles.buttonText}>Accedi</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.link}>Password dimenticata?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Non hai un account? <Text style={styles.linkBold}>Registrati</Text></Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: spacing.lg },
  logoWrap: { width: 68, height: 68, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.md },
  title: { color: colors.accentText, fontSize: 32, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.xl },
  input: {
    backgroundColor: colors.inputBg, color: colors.text, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 14, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border, fontSize: 16,
  },
  button: {
    backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 15,
    alignItems: 'center', marginTop: spacing.sm,
  },
  buttonText: { color: '#121417', fontWeight: '800', fontSize: 16 },
  link: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  linkBold: { color: colors.accentText, fontWeight: '700' },
});
