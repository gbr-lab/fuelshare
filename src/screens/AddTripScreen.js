import { useMemo } from 'react';
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput } from '../components/Typo';
import { useApp } from '../context/AppContext';
import { spacing, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { lastKnownKm, fmtKm } from '../utils/calc';

const MODES = ['Urbano', 'Extraurbano', 'Autostrada', 'Misto'];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AddTripScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { activeVehicle, addTrip, trips, refuels } = useApp();
  // Km iniziali precompilati con l'ultimo valore noto del contachilometri (modificabili)
  const lastKm = lastKnownKm(activeVehicle, trips, refuels);
  const [date, setDate] = useState(todayISO());
  const [kmStart, setKmStart] = useState(fmtKm(lastKm));
  const [kmEnd, setKmEnd] = useState('');
  const [byDistance, setByDistance] = useState(false); // false = km finali, true = km percorsi
  const [mode, setMode] = useState('Misto');

  const startNum = parseFloat(kmStart.replace(',', '.'));
  const isFirst = trips.length === 0; // primo viaggio di questo veicolo
  const base = isNaN(startNum) ? lastKm : startNum;
  const startBelowLast = !isNaN(startNum) && startNum < lastKm;

  const onSave = () => {
    const s = parseFloat(kmStart.replace(',', '.'));
    const typed = parseFloat(kmEnd.replace(',', '.'));
    if (isNaN(s) || isNaN(typed)) return Alert.alert('Attenzione', 'Inserisci km validi.');
    const e = byDistance ? s + typed : typed;
    if (e < s) return Alert.alert('Attenzione', 'I km finali devono essere maggiori o uguali a quelli iniziali.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Alert.alert('Attenzione', 'Data non valida (formato AAAA-MM-GG).');
    addTrip({ date, kmStart: s, kmEnd: e, drivingMode: mode });
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <Text style={styles.label}>Data (AAAA-MM-GG)</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="2026-11-09" placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>Km iniziali</Text>
      <TextInput style={styles.input} value={kmStart} onChangeText={setKmStart} keyboardType="decimal-pad" placeholder={isFirst ? '0' : fmtKm(lastKm)} placeholderTextColor={colors.textMuted} />
      {startBelowLast ? (
        <Text style={[styles.hint, { color: colors.red }]}>Attenzione: l'ultimo valore noto è {fmtKm(lastKm)} km. Va bene solo se stai registrando un viaggio passato.</Text>
      ) : (
        <Text style={styles.hint}>Precompilato dall'ultimo valore noto del contachilometri. Puoi modificarlo.</Text>
      )}

      <View style={styles.segment}>
        {[['Km finali', false], ['Km percorsi', true]].map(([label, val]) => (
          <TouchableOpacity key={label} style={[styles.segItem, byDistance === val && styles.segItemActive]} onPress={() => { setByDistance(val); setKmEnd(''); }}>
            <Text style={[styles.segText, byDistance === val && styles.segTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={styles.input} value={kmEnd} onChangeText={setKmEnd} keyboardType="decimal-pad" placeholder={isFirst ? '0' : byDistance ? '10' : fmtKm(base + 10)} placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>Modalità di guida</Text>
      <View style={styles.row}>
        {MODES.map((m) => (
          <TouchableOpacity key={m} style={[styles.chip, mode === m && styles.chipActive]} onPress={() => setMode(m)}>
            <Text style={[styles.chipText, mode === m && styles.chipTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={onSave}>
        <Text style={styles.buttonText}>Salva viaggio</Text>
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
  segment: { flexDirection: 'row', backgroundColor: colors.inputBg, borderRadius: radius.md, padding: 3, marginTop: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm },
  segItemActive: { backgroundColor: colors.accent },
  segText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  segTextActive: { color: '#121417', fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.card, borderRadius: radius.full, paddingHorizontal: spacing.md,
    paddingVertical: 8, marginRight: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontSize: 13 },
  chipTextActive: { color: '#121417', fontWeight: '700' },
  button: {
    backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 15,
    alignItems: 'center', marginTop: spacing.lg,
  },
  buttonText: { color: '#121417', fontWeight: '800', fontSize: 16 },
});
