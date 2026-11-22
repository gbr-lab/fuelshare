// Mostra il codice di recupero con pulsante per salvarlo/condividerlo
import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Typo';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius } from '../theme';

export default function RecoveryCodeBox({ code }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View>
      <View style={styles.box}>
        <Text style={styles.code} selectable>{code}</Text>
      </View>
      <TouchableOpacity
        style={styles.shareBtn}
        onPress={() => Share.share({ message: `Codice di recupero FuelShare: ${code}` })}
      >
        <Ionicons name="share-outline" size={18} color={colors.accentText} />
        <Text style={styles.shareText}>Salva o condividi (note, gestore di password…)</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  box: { backgroundColor: colors.inputBg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center' },
  code: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: 1.5, textAlign: 'center' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  shareText: { color: colors.accentText, fontWeight: '700', fontSize: 14 },
});
