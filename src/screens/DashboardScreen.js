import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors, spacing, radius } from '../theme';

export default function DashboardScreen({ navigation }) {
  const { activeVehicle, trips, refuels } = useApp();

  if (!activeVehicle) {
    return (
      <View style={styles.center}>
        <Text style={styles.emoji}>⛽</Text>
        <Text style={styles.infoTitle}>Nessun veicolo attivo</Text>
        <Text style={styles.infoSub}>Vai nel tab Garage e aggiungi il tuo primo veicolo.</Text>
      </View>
    );
  }

  const totalKm = trips.reduce((s, t) => s + t.distance, 0);
  const totalLiters = refuels.reduce((s, r) => s + r.liters, 0);
  const consumption = activeVehicle.corrected_consumption;

  const recent = [...trips, ...refuels.map((r) => ({ ...r, isRefuel: true }))]
    .sort((a, b) => (b.date + (b.id || 0)).localeCompare(a.date + (a.id || 0)))
    .slice(0, 8);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <Text style={styles.vehicleName}>{activeVehicle.name}</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalKm.toFixed(0)}</Text>
          <Text style={styles.statLabel}>km totali</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalLiters.toFixed(1)}</Text>
          <Text style={styles.statLabel}>litri riforniti</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.accent }]}>{Number(consumption).toFixed(1)}</Text>
          <Text style={styles.statLabel}>l/100km (corretto)</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.accent }]} onPress={() => navigation.navigate('AddTrip')}>
          <Text style={styles.actionText}>🛣️  Registra viaggio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.green }]} onPress={() => navigation.navigate('AddRefuel')}>
          <Text style={styles.actionText}>⛽  Registra rifornimento</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Attività recente</Text>
      {recent.length === 0 && <Text style={styles.infoSub}>Nessuna attività registrata.</Text>}
      {recent.map((item) => (
        <View key={(item.isRefuel ? 'r' : 't') + item.id} style={styles.activityRow}>
          <Text style={styles.activityIcon}>{item.isRefuel ? '⛽' : '🛣️'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.activityText}>
              {item.isRefuel
                ? `${item.liters.toFixed(1)} l a ${item.user_name}`
                : `${item.distance.toFixed(1)} km · ${item.driving_mode}`}
            </Text>
            <Text style={styles.activitySub}>{item.date} · {item.user_name}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  emoji: { fontSize: 48 },
  infoTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.sm },
  infoSub: { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
  vehicleName: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 4, textAlign: 'center' },
  actionsRow: { gap: spacing.sm, marginTop: spacing.md },
  actionButton: { borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  actionText: { color: '#121417', fontWeight: '800', fontSize: 15 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
  activityRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  activityIcon: { fontSize: 20, marginRight: spacing.sm },
  activityText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  activitySub: { color: colors.textMuted, fontSize: 12 },
});
