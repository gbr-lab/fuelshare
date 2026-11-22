// Schermata a tutto schermo mostrata dopo la registrazione o quando generi un nuovo codice
import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Typo';
import RecoveryCodeBox from '../components/RecoveryCodeBox';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius } from '../theme';

export default function RecoveryCodeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { pendingRecoveryCode, ackRecoveryCode } = useApp();
  const [saved, setSaved] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.iconWrap}><Ionicons name="key-outline" size={30} color="#121417" /></View>
      <Text style={styles.title}>Il tuo codice di recupero</Text>
      <Text style={styles.sub}>
        Se dimentichi la password, questo codice è l'unico modo per rientrare nel tuo account. Non c'è nessun server che possa
        reimpostarla per te, quindi conservalo in un posto sicuro. Non verrà mostrato di nuovo.
      </Text>
      <RecoveryCodeBox code={pendingRecoveryCode} />
      <Text style={styles.warn}>Non condividerlo con nessuno: chi lo ha può reimpostare la tua password.</Text>

      <TouchableOpacity style={styles.check} onPress={() => setSaved((v) => !v)} activeOpacity={0.8}>
        <Ionicons name={saved ? 'checkbox' : 'square-outline'} size={24} color={saved ? colors.green : colors.textMuted} />
        <Text style={styles.checkText}>Ho salvato il codice in un posto sicuro</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, !saved && { opacity: 0.4 }]} disabled={!saved} onPress={ackRecoveryCode}>
        <Text style={styles.buttonText}>Continua</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 80, paddingBottom: spacing.xl },
  iconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  sub: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.lg, lineHeight: 20 },
  warn: { color: colors.red, fontSize: 12, textAlign: 'center', marginBottom: spacing.md },
  check: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.md },
  checkText: { flex: 1, color: colors.text, fontSize: 14 },
  button: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  buttonText: { color: '#121417', fontWeight: '800', fontSize: 16 },
});
