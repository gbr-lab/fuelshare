import { useMemo } from 'react';
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, SectionList, Alert } from 'react-native';
import { Text } from '../components/Typo';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { spacing, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';

export default function SelectiveClearScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { trips, refuels, deleteSelected } = useApp();
  const [sel, setSel] = useState(new Set());

  const toggle = (key) => {
    const next = new Set(sel);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSel(next);
  };

  const allKeys = [...trips.map((t) => 't' + t.id), ...refuels.map((r) => 'r' + r.id)];
  const selectAll = () => setSel(sel.size === allKeys.length ? new Set() : new Set(allKeys));

  const onDelete = () => {
    const tIds = [...sel].filter((k) => k.startsWith('t')).map((k) => Number(k.slice(1)));
    const rIds = [...sel].filter((k) => k.startsWith('r')).map((k) => Number(k.slice(1)));
    Alert.alert('Elimina selezionati', `Verranno eliminati ${tIds.length} viaggi e ${rIds.length} rifornimenti. Procedere?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => { deleteSelected(tIds, rIds); setSel(new Set()); } },
    ]);
  };

  const sections = [
    { title: 'Viaggi', data: trips.map((t) => ({ ...t, kind: 'trip' })) },
    { title: 'Rifornimenti', data: refuels.map((r) => ({ ...r, kind: 'refuel' })) },
  ];

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(i) => i.kind + i.id}
        contentContainerStyle={{ padding: spacing.md }}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const key = (item.kind === 'trip' ? 't' : 'r') + item.id;
          const checked = sel.has(key);
          return (
            <TouchableOpacity style={styles.row} onPress={() => toggle(key)}>
              <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={22}
                color={checked ? colors.accent : colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>
                  {item.kind === 'trip'
                    ? `${item.date} · ${item.distance.toFixed(1)} km · ${item.user_name}`
                    : `${item.date} · ${item.liters.toFixed(1)} l · ${item.user_name}`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Nessun dato presente.</Text>}
      />
      <View style={styles.footer}>
        <TouchableOpacity style={styles.selectAllBtn} onPress={selectAll}>
          <Text style={styles.selectAllText}>{sel.size === allKeys.length ? 'Deseleziona tutto' : 'Seleziona tutto'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.deleteBtn, sel.size === 0 && { opacity: 0.4 }]} disabled={sel.size === 0} onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
          <Text style={styles.deleteText}>Elimina ({sel.size})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  sectionHeader: { color: colors.textMuted, fontSize: 13, fontWeight: '700', marginTop: spacing.sm, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card,
    borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border,
  },
  rowText: { color: colors.text, fontSize: 14 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  footer: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  selectAllBtn: {
    flex: 1, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  selectAllText: { color: colors.text, fontWeight: '700' },
  deleteBtn: {
    flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
    backgroundColor: colors.red, borderRadius: radius.md, paddingVertical: 14,
  },
  deleteText: { color: '#FFFFFF', fontWeight: '800' },
});
