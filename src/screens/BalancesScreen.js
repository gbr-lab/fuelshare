import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { computeBalances } from '../utils/calc';
import { colors, spacing, radius } from '../theme';

export default function BalancesScreen() {
  const { activeVehicle, trips, refuels, models } = useApp();

  if (!activeVehicle) {
    return (
      <View style={styles.center}>
        <Text style={styles.emoji}>⚖️</Text>
        <Text style={styles.infoTitle}>Nessun veicolo attivo</Text>
        <Text style={styles.infoSub}>Aggiungi un veicolo dal tab Garage.</Text>
      </View>
    );
  }

  // Gli utenti che compaiono nello storico del veicolo
  const usersMap = {};
  for (const t of trips) usersMap[t.user_id] = { id: t.user_id, name: t.user_name };
  for (const r of refuels) usersMap[r.user_id] = { id: r.user_id, name: r.user_name };
  const users = Object.values(usersMap);

  const balances = computeBalances(activeVehicle, users, trips, refuels);
  const totalKm = trips.reduce((s, t) => s + t.distance, 0);
  const unit = activeVehicle.fuel_type === 'Elettrico' ? 'kWh' : 'litri';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      {users.length === 0 ? (
        <Text style={styles.infoSub}>Registra almeno un viaggio o un rifornimento per vedere i saldi.</Text>
      ) : (
        balances.map((b) => (
          <View key={b.userId} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{b.name}</Text>
              <Text style={[styles.balance, { color: b.balance >= 0 ? colors.green : colors.red }]}>
                {b.balance >= 0 ? '+' : ''}{b.balance.toFixed(1)} {unit}
              </Text>
            </View>

            <View style={styles.barContainer}>
              <View style={[styles.bar, { width: `${Math.min(b.kmPercent, 100)}%`, backgroundColor: colors.accent }]} />
            </View>
            <Text style={styles.detail}>
              {b.km.toFixed(0)} km ({b.kmPercent.toFixed(0)}%) → {b.due.toFixed(1)} {unit} dovuti
            </Text>

            <Text style={styles.detail}>Ha pagato: {b.paid.toFixed(1)} {unit}</Text>
            <Text style={styles.hint}>
              {b.balance >= 0
                ? `Gli altri gli devono ${b.balance.toFixed(1)} ${unit}`
                : `Deve ${Math.abs(b.balance).toFixed(1)} ${unit} agli altri`}
            </Text>
          </View>
        ))
      )}

      <Text style={styles.footer}>
        Basato sul consumo corretto di {Number(activeVehicle.corrected_consumption).toFixed(1)} {activeVehicle.fuel_type === 'Elettrico' ? 'kWh' : 'l'}/100km · {totalKm.toFixed(0)} km totali
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  emoji: { fontSize: 48 },
  infoTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.sm },
  infoSub: { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  name: { color: colors.text, fontSize: 17, fontWeight: '700' },
  balance: { fontSize: 18, fontWeight: '800' },
  barContainer: { height: 8, backgroundColor: colors.inputBg, borderRadius: radius.full, overflow: 'hidden', marginBottom: spacing.xs },
  bar: { height: 8, borderRadius: radius.full },
  detail: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  hint: { color: colors.accent, fontSize: 13, fontWeight: '600', marginTop: spacing.sm },
  footer: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: spacing.md, marginBottom: spacing.xl },
});
