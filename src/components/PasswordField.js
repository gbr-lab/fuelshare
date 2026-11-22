// Campo password con occhio mostra/nascondi. Consente incolla e gestori di password.
import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextInput } from './Typo';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius } from '../theme';
import { MAX_PASSWORD_LENGTH } from '../utils/security';

export default function PasswordField({ value, onChangeText, placeholder, isNew = false, style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);
  return (
    <View style={[styles.wrap, style]}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        maxLength={MAX_PASSWORD_LENGTH}
        autoComplete={isNew ? 'new-password' : 'current-password'}
        textContentType={isNew ? 'newPassword' : 'password'}
      />
      <TouchableOpacity onPress={() => setVisible((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel={visible ? 'Nascondi password' : 'Mostra password'}>
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: radius.md,
    paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  input: { flex: 1, color: colors.text, paddingVertical: 14, fontSize: 16 },
});
