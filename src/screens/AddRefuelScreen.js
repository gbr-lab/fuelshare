import { useMemo } from 'react';
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput } from '../components/Typo';
import { useApp } from '../context/AppContext';
import { spacing, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { lastKnownKm, fmtKm } from '../utils/calc';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AddRefuelScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { activeVehicle, addRefuel, trips, refuels } = useApp();
  const lastKm = lastKnownKm(activeVehicle, trips, refuels);
  const [date, setDate] = useState(todayISO());
  const [liters, setLiters] = useState('');
  const [kmOdometer, setKmOdometer] = useState(fmtKm(lastKm));
  const [price, setPrice] = useState('');

  const onSave = () => {
    const l = parseFloat(liters.replace(',', '.'));
    const k = parseFloat(kmOdometer.replace(',', '.'));
    if (isNaN(l) || l <= 0) return Alert.alert('Attenzione', 'Inserisci i litri immessi.');
    if (isNaN(k) || k < 0) return Alert.alert('Attenzione', 'Inserisci i km sul contachilometri.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Alert.alert('Attenzione', 'Data non valida (formato AAAA-MM-GG).');
    let p = null;
    if (price.trim() !== '') {
      p = parseFloat(price.replace(',', '.'));
      if (isNaN(p) || p <= 0) return Alert.alert('Attenzione', 'Prezzo per litro non valido (lascia vuoto se non lo conosci).');
    }
    addRefuel({ date, liters: l, kmOdometer: k, pricePerLiter: p });
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <Text style={styles.label}>Data (AAAA-MM-GG)</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="2026-11-09" placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>{activeVehicle?.fuel_type === 'Elettrico' ? 'kWh immessi' : 'Litri immessi'}</Text>
      <TextInput style={styles.input} value={liters} onChangeText={setLiters} keyboardType="decimal-pad" placeholder="Es. 38.5" placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>Km sul contachilometri</Text>
      <TextInput style={styles.input} value={kmOdometer} onChangeText={setKmOdometer} keyboardType="decimal-pad" placeholder={refuels.length === 0 && trips.length === 0 ? '0' : fmtKm(lastKm + 10)} placeholderTextColor={colors.textMuted} />
      <Text style={styles.hint}>Precompilato con l'ultimo valore noto ({fmtKm(lastKm)} km): aggiornalo con quello che leggi ora sul contachilometri.</Text>

      <Text style={styles.label}>Prezzo al litro (facoltativo, per i calcoli in €)</Text>
      <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="Es. 1.689" placeholderTextColor={colors.textMuted} />

      <TouchableOpacity style={styles.button} onPress={onSave}>
        <Text style={styles.buttonText}>Salva rifornimento</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: spacing.xs, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.inputBg, color: colors.text, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, fontSize: 16,
  },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  button: {
    backgroundColor: colors.green, borderRadius: radius.md, paddingVertical: 15,
    alignItems: 'center', marginTop: spacing.lg,
  },
  buttonText: { color: '#121417', fontWeight: '800', fontSize: 16 },
});
