// Barra che mostra la robustezza della password mentre si digita
import React from 'react';
import { View } from 'react-native';
import { Text } from './Typo';
import { useTheme } from '../context/ThemeContext';
import { passwordStrength, MIN_PASSWORD_LENGTH } from '../utils/security';

export default function StrengthMeter({ password }) {
  const { colors } = useTheme();
  const { score, label } = passwordStrength(password);
  const palette = [colors.red, colors.red, colors.accent, colors.green, colors.green];
  return (
    <View style={{ marginBottom: 12, marginTop: -4 }}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: password && i <= score ? palette[score] : colors.border }} />
        ))}
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
        {password ? `Robustezza: ${label}. ` : ''}Minimo {MIN_PASSWORD_LENGTH} caratteri: una frase lunga va benissimo.
      </Text>
    </View>
  );
}
