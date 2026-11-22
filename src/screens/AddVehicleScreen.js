import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput } from '../components/Typo';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { spacing, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';

const FUELS = ['Diesel', 'Benzina', 'GPL', 'Metano', 'Ibrida', 'Elettrico'];

// Normalizza una stringa per il confronto "simile": minuscolo, senza accenti e caratteri extra
function normalize(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Punteggio di somiglianza: quante parole della ricerca compaiono nel nome (anche parziali)
function score(modelName, queryWords) {
  const name = normalize(modelName);
  let hits = 0;
  for (const w of queryWords) {
    if (w.length >= 2 && name.includes(w)) hits++;
  }
  return hits;
}

export default function AddVehicleScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { models, addVehicle } = useApp();
  const [search, setSearch] = useState('');
  const [modelId, setModelId] = useState(null);
  const [name, setName] = useState('');
  const [fuelType, setFuelType] = useState('Diesel');
  const [tank, setTank] = useState('');
  const [consumption, setConsumption] = useState('');
  const [kmInitial, setKmInitial] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Filtro intelligente: corrispondenza anche parziale/simile, ordinata per pertinenza
  const suggestions = useMemo(() => {
    const q = normalize(search);
    if (!q) return models;
    const words = q.split(' ').filter((w) => w.length >= 2);
    return models
      .map((m) => ({ m, s: score(m.name, words) }))
      .filter((x) => x.s > 0 || normalize(x.m.name).includes(q))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.m);
  }, [search, models]);

  const pickModel = (m) => {
    setModelId(m.id);
    setName(m.name);
    setFuelType(m.fuel_type);
    setTank(String(m.tank_capacity));
    setConsumption(String(m.declared_consumption));
    setSearch(m.name);
    setDropdownOpen(false);
  };

  const onSave = () => {
    if (!name.trim()) return Alert.alert('Attenzione', 'Inserisci il nome del veicolo.');
    const tankN = parseFloat(tank.replace(',', '.'));
    const consN = parseFloat(consumption.replace(',', '.'));
    const kmN = parseFloat((kmInitial || '0').replace(',', '.'));
    if (isNaN(tankN) || isNaN(consN) || isNaN(kmN)) return Alert.alert('Attenzione', 'Controlla i valori numerici inseriti.');
    addVehicle({ modelId, name: name.trim(), fuelType, tankCapacity: tankN, declaredConsumption: consN, kmInitial: kmN });
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      {/* Ricerca modello con menu a tendina */}
      <Text style={styles.label}>Modello (cerca tra quelli disponibili)</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={(t) => { setSearch(t); setModelId(null); setDropdownOpen(true); }}
          onFocus={() => setDropdownOpen(true)}
          placeholder="Es. meriva, golf, panda…"
          placeholderTextColor={colors.textMuted}
        />
        {search !== '' && (
          <TouchableOpacity onPress={() => { setSearch(''); setDropdownOpen(false); }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {dropdownOpen && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {suggestions.map((item) => (
              <TouchableOpacity key={item.id} style={styles.dropdownItem} onPress={() => pickModel(item)}>
                <Text style={styles.dropdownText} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.dropdownSub}>{item.fuel_type} · {item.declared_consumption} l/100km</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      {dropdownOpen && search !== '' && suggestions.length === 0 && (
        <Text style={styles.noResult}>Nessun modello trovato: compila i campi manualmente qui sotto.</Text>
      )}

      <Text style={styles.label}>Nome veicolo</Text>
      <TextInput style={styles.input} value={name} onChangeText={(t) => { setName(t); setModelId(null); }} placeholder="Es. Opel Meriva" placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>Alimentazione</Text>
      <View style={styles.row}>
        {FUELS.map((f) => (
          <TouchableOpacity key={f} style={[styles.chip, fuelType === f && styles.chipActive]} onPress={() => setFuelType(f)}>
            <Text style={[styles.chipText, fuelType === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{fuelType === 'Elettrico' ? 'Capacità batteria (kWh)' : 'Capacità serbatoio (litri)'}</Text>
      <TextInput style={styles.input} value={tank} onChangeText={setTank} keyboardType="decimal-pad" placeholder="Es. 52" placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>{fuelType === 'Elettrico' ? 'Consumo dichiarato (kWh/100km)' : 'Consumo dichiarato (l/100km)'}</Text>
      <TextInput style={styles.input} value={consumption} onChangeText={setConsumption} keyboardType="decimal-pad" placeholder="Es. 4.9" placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>Km attuali sul contachilometri</Text>
      <TextInput style={styles.input} value={kmInitial} onChangeText={setKmInitial} keyboardType="decimal-pad" placeholder="Es. 150000" placeholderTextColor={colors.textMuted} />

      <TouchableOpacity style={styles.button} onPress={onSave}>
        <Text style={styles.buttonText}>Salva veicolo</Text>
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
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.inputBg, borderRadius: radius.md, paddingHorizontal: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 12, fontSize: 16 },
  dropdown: {
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    marginTop: 4, overflow: 'hidden',
  },
  dropdownItem: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  dropdownSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  noResult: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm, fontStyle: 'italic' },
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
