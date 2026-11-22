import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, FlatList, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-gifted-charts';
import { Text } from '../components/Typo';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { monthlyStats, formatEuro, computeBalances, usersFromActivity, settlements } from '../utils/calc';
import { spacing, radius, userColor } from '../theme';
import Avatar from '../components/Avatar';

export default function OverviewScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const { user, vehicles, activeVehicle, setActiveVehicleId, trips: allTrips, refuels: allRefuels, members } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scope, setScope] = useState('vehicle'); // 'vehicle' = tutto il veicolo, 'me' = solo i miei dati

  if (!activeVehicle) {
    return (
      <View style={styles.center}>
        <Ionicons name="speedometer-outline" size={48} color={colors.textMuted} />
        <Text style={styles.infoTitle}>Nessun veicolo attivo</Text>
        <Text style={styles.infoSub}>Aggiungi un veicolo dal tab Garage per iniziare.</Text>
      </View>
    );
  }

  const isElectric = activeVehicle.fuel_type === 'Elettrico';
  const unit = isElectric ? 'kWh' : 'l';
  const consumption = activeVehicle.corrected_consumption || activeVehicle.declared_consumption || 6;
  const isShared = !!activeVehicle.is_shared;
  const onlyMe = isShared && scope === 'me';
  const trips = onlyMe ? allTrips.filter((t) => t.user_id === user.id) : allTrips;
  const refuels = onlyMe ? allRefuels.filter((r) => r.user_id === user.id) : allRefuels;
  const stats = monthlyStats(trips, refuels, consumption);
  const cur = stats[stats.length - 1];
  const prev = stats[stats.length - 2];
  const delta = prev.liters - cur.liters; // positivo = consumo in calo
  const totalKm = trips.reduce((s, t) => s + t.distance, 0);

  // I saldi si calcolano sempre su tutti i dati del veicolo, indipendentemente dal filtro "Solo io"
  const users = usersFromActivity(allTrips, allRefuels, members);
  const balances = computeBalances(activeVehicle, users, allTrips, allRefuels);
  const showBalances = balances.length > 0 && (isShared || balances.length > 1);
  const ranking = [...balances].sort((a, b) => b.balance - a.balance);
  const me = balances.find((b) => b.userId === user.id);
  const maxAbs = Math.max(0.1, ...balances.map((b) => Math.abs(b.balance)));
  const transfers = settlements(balances);

  // Il grafico occupa tutta la larghezza della card, senza scroll (così non litiga con lo swipe tra le sezioni)
  const chartArea = Math.max(width - spacing.md * 2 - spacing.md * 2 - 48, 180);
  const slot = chartArea / stats.length;
  const barWidth = Math.floor(slot * 0.58);
  const barSpacing = Math.floor(slot - barWidth);

  const chartData = stats.map((m) => ({
    value: Math.round(m.liters * 10) / 10,
    label: m.label,
    frontColor: m.key === cur.key ? colors.accent : colors.green,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
        {/* Selettore veicolo */}
        <TouchableOpacity style={styles.picker} onPress={() => setPickerOpen(true)} activeOpacity={0.8}>
          <Ionicons name="car-sport-outline" size={20} color={colors.accentText} />
          <Text style={styles.pickerText} numberOfLines={1}>{activeVehicle.name}</Text>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Su un veicolo condiviso: tutto il veicolo oppure solo i miei dati */}
        {isShared && (
          <View style={styles.segment}>
            {[['vehicle', 'Veicolo'], ['me', 'Solo io']].map(([key, label]) => (
              <TouchableOpacity key={key} style={[styles.segItem, scope === key && styles.segItemActive]} onPress={() => setScope(key)}>
                <Text style={[styles.segText, scope === key && styles.segTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Blocco centrale: consumo del mese */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>{isElectric ? 'kWh usati questo mese' : 'Litri usati questo mese'}{onlyMe ? ' · solo tu' : isShared ? ' · veicolo' : ''}</Text>
          <Text style={styles.heroValue}>{cur.liters.toFixed(1)} <Text style={styles.heroUnit}>{unit}</Text></Text>
          {cur.liters > 0 && prev.liters > 0 ? (
            <View style={styles.deltaRow}>
              <Ionicons name={delta >= 0 ? 'trending-down' : 'trending-up'} size={16}
                color={delta >= 0 ? colors.green : colors.red} />
              <Text style={[styles.deltaText, { color: delta >= 0 ? colors.green : colors.red }]}>
                {Math.abs(delta).toFixed(1)} {unit} {delta >= 0 ? 'in meno' : 'in più'} rispetto al mese scorso
              </Text>
            </View>
          ) : (
            <Text style={styles.deltaNeutral}>Il confronto con il mese scorso apparirà quando avrai attività in entrambi i mesi</Text>
          )}
          <Text style={styles.heroFoot}>Consumo medio stimato: {Number(consumption).toFixed(1)} {unit}/100 km</Text>
        </View>

        {/* Due blocchi piccoli */}
        <View style={styles.row}>
          <View style={styles.smallCard}>
            <Ionicons name="navigate-outline" size={18} color={colors.accentText} />
            <Text style={styles.smallValue}>{cur.km.toFixed(0)} km</Text>
            <Text style={styles.smallLabel}>questo mese</Text>
            <Text style={styles.smallSub}>totale {totalKm.toFixed(0)} km</Text>
          </View>
          <View style={styles.smallCard}>
            <Ionicons name="cash-outline" size={18} color={colors.green} />
            <Text style={styles.smallValue}>{cur.hasPrices ? formatEuro(cur.money) : '—'}</Text>
            <Text style={styles.smallLabel}>spesi questo mese</Text>
            <Text style={styles.smallSub}>{cur.hasPrices ? 'basato sui prezzi inseriti' : 'inserisci il prezzo/l nei rifornimenti'}</Text>
          </View>
        </View>

        {/* Grafico consumo */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Consumo stimato — ultimi 6 mesi ({unit})</Text>
          {chartData.every((d) => d.value === 0) ? (
            <Text style={styles.chartEmpty}>Nessun dato: registra viaggi per vedere il grafico.</Text>
          ) : (
            <BarChart
              data={chartData}
              width={chartArea}
              barWidth={barWidth}
              spacing={barSpacing}
              initialSpacing={Math.floor(barSpacing / 2)}
              endSpacing={0}
              disableScroll
              barBorderRadius={6}
              noOfSections={4}
              yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
              rulesColor={colors.border}
              yAxisColor={colors.border}
              xAxisColor={colors.border}
              isAnimated
            />
          )}
        </View>

        {/* Confronto saldi tra i conducenti */}
        {showBalances && (
          <View style={{ marginTop: spacing.md }}>
            <Text style={styles.sectionTitle}>Confronto saldi {isElectric ? 'kWh' : 'litri'}</Text>

            {/* Il tuo saldo, in evidenza */}
            {me && (
              <View style={[styles.meCard, { borderColor: me.balance >= 0 ? colors.green : colors.red }]}>
                <Avatar id={user.id} name={user.name} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.meLabel}>{me.balance >= 0 ? 'Sei in credito' : 'Devi compensare'}</Text>
                  <Text style={[styles.meValue, { color: me.balance >= 0 ? colors.green : colors.red }]}>
                    {me.balance >= 0 ? '+' : '−'}{Math.abs(me.balance).toFixed(1)} {unit}
                  </Text>
                </View>
                <Text style={styles.meSub}>{me.km.toFixed(0)} km · {me.kmPercent.toFixed(0)}%</Text>
              </View>
            )}

            {/* Chi ha guidato quanto */}
            <View style={styles.compareCard}>
              <Text style={styles.chartTitle}>Quota dei km</Text>
              <View style={styles.stack}>
                {balances.filter((b) => b.km > 0).map((b) => (
                  <View key={b.userId} style={{ flex: b.km, backgroundColor: userColor(b.userId) }} />
                ))}
                {balances.every((b) => b.km === 0) && <View style={{ flex: 1, backgroundColor: colors.border }} />}
              </View>
              <View style={styles.legend}>
                {balances.map((b) => (
                  <View key={b.userId} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: userColor(b.userId) }]} />
                    <Text style={styles.legendText}>{b.userId === user.id ? 'Tu' : b.name} {b.kmPercent.toFixed(0)}%</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Classifica saldi: barre divergenti (verde = credito, rosso = debito) */}
            <View style={styles.compareCard}>
              <Text style={styles.chartTitle}>Saldo di ciascuno</Text>
              {ranking.map((b) => {
                const isMe = b.userId === user.id;
                const w = (Math.abs(b.balance) / maxAbs) * 50;
                return (
                  <View key={b.userId} style={[styles.divRow, isMe && styles.divRowMe]}>
                    <Text style={[styles.divName, isMe && { color: colors.accentText }]} numberOfLines={1}>{isMe ? 'Tu' : b.name}</Text>
                    <View style={styles.divTrack}>
                      <View style={styles.divCenter} />
                      <View style={[styles.divBar, b.balance >= 0
                        ? { left: '50%', width: `${w}%`, backgroundColor: colors.green, borderTopRightRadius: 6, borderBottomRightRadius: 6 }
                        : { right: '50%', width: `${w}%`, backgroundColor: colors.red, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }]} />
                    </View>
                    <Text style={[styles.divValue, { color: b.balance >= 0 ? colors.green : colors.red }]}>
                      {b.balance >= 0 ? '+' : '−'}{Math.abs(b.balance).toFixed(1)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Tabella dettagliata */}
            <View style={styles.compareCard}>
              <Text style={styles.chartTitle}>Dettaglio ({unit})</Text>
              <View style={styles.tRow}>
                <Text style={[styles.tHead, { flex: 2 }]}>Utente</Text>
                <Text style={styles.tHead}>Km</Text>
                <Text style={styles.tHead}>Dovuti</Text>
                <Text style={styles.tHead}>Pagati</Text>
              </View>
              {ranking.map((b) => {
                const isMe = b.userId === user.id;
                return (
                  <View key={b.userId} style={[styles.tRow, isMe && styles.tRowMe]}>
                    <View style={[styles.tUser, { flex: 2 }]}>
                      <View style={[styles.legendDot, { backgroundColor: userColor(b.userId) }]} />
                      <Text style={[styles.tCell, isMe && { fontWeight: '800' }]} numberOfLines={1}>{isMe ? 'Tu' : b.name}</Text>
                    </View>
                    <Text style={styles.tCell}>{b.km.toFixed(0)}</Text>
                    <Text style={styles.tCell}>{b.due.toFixed(1)}</Text>
                    <Text style={styles.tCell}>{b.paid.toFixed(1)}</Text>
                  </View>
                );
              })}
            </View>

            {/* Come pareggiare */}
            <View style={styles.compareCard}>
              <Text style={styles.chartTitle}>Per pareggiare i conti</Text>
              {transfers.length === 0 ? (
                <Text style={styles.balanceDetail}>Siete in pari: nessuna compensazione necessaria.</Text>
              ) : transfers.map((t, i) => (
                <View key={i} style={styles.transferRow}>
                  <Text style={styles.transferText} numberOfLines={1}>{t.fromId === user.id ? 'Tu' : t.from}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
                  <Text style={styles.transferText} numberOfLines={1}>{t.toId === user.id ? 'Te' : t.to}</Text>
                  <Text style={styles.transferValue}>{t.liters.toFixed(1)} {unit}</Text>
                </View>
              ))}
              {transfers.length > 0 && (
                <Text style={styles.balanceDetail}>Chi è in debito compensa pagando il prossimo rifornimento (o rimborsando l'equivalente dei litri).</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Menu a tendina veicoli */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <View style={styles.modalBox}>
            <FlatList
              data={vehicles}
              keyExtractor={(i) => String(i.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => { setActiveVehicleId(item.id); setPickerOpen(false); }}
                >
                  <Ionicons name={item.is_shared ? 'people-outline' : 'car-outline'} size={18}
                    color={item.id === activeVehicle.id ? colors.accentText : colors.textMuted} />
                  <Text style={[styles.modalItemText, item.id === activeVehicle.id && { color: colors.accentText, fontWeight: '700' }]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  infoTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.sm },
  infoSub: { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
  picker: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  pickerText: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
  segment: { flexDirection: 'row', backgroundColor: colors.inputBg, borderRadius: radius.md, padding: 3, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm },
  segItemActive: { backgroundColor: colors.accent },
  segText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  segTextActive: { color: '#121417', fontWeight: '800' },
  meCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 2, marginBottom: spacing.sm },
  meLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  meValue: { fontSize: 26, fontWeight: '800' },
  meSub: { color: colors.textMuted, fontSize: 12 },
  compareCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  stack: { flexDirection: 'row', height: 14, borderRadius: radius.full, overflow: 'hidden', backgroundColor: colors.border },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.textMuted, fontSize: 12 },
  divRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6, paddingHorizontal: 6, borderRadius: radius.sm },
  divRowMe: { backgroundColor: colors.inputBg },
  divName: { width: 64, color: colors.text, fontSize: 13, fontWeight: '700' },
  divTrack: { flex: 1, height: 18, justifyContent: 'center' },
  divCenter: { position: 'absolute', left: '50%', width: 1, height: 18, backgroundColor: colors.border },
  divBar: { position: 'absolute', height: 14 },
  divValue: { width: 52, textAlign: 'right', fontSize: 13, fontWeight: '800' },
  tRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderRadius: radius.sm },
  tRowMe: { backgroundColor: colors.inputBg },
  tHead: { flex: 1, color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  tUser: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tCell: { flex: 1, color: colors.text, fontSize: 13 },
  transferRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  transferText: { color: colors.text, fontSize: 14, fontWeight: '700', maxWidth: 90 },
  transferValue: { marginLeft: 'auto', color: colors.accentText, fontSize: 15, fontWeight: '800' },
  hero: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  heroLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  heroValue: { color: colors.accentText, fontSize: 48, fontWeight: '800', marginTop: spacing.xs },
  heroUnit: { fontSize: 22, fontWeight: '700' },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  deltaText: { fontSize: 13, fontWeight: '600' },
  deltaNeutral: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm, textAlign: 'center' },
  heroFoot: { color: colors.textMuted, fontSize: 11, marginTop: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  smallCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'flex-start', gap: 4,
  },
  smallValue: { color: colors.text, fontSize: 19, fontWeight: '800', marginTop: spacing.xs },
  smallLabel: { color: colors.textMuted, fontSize: 12 },
  smallSub: { color: colors.textMuted, fontSize: 10 },
  chartCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  chartTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: spacing.md },
  chartEmpty: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: spacing.lg },
  sectionTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  balanceCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  balanceName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  balanceValue: { fontSize: 17, fontWeight: '800' },
  barTrack: { height: 8, backgroundColor: colors.inputBg, borderRadius: radius.full, overflow: 'hidden', marginBottom: spacing.xs },
  barFill: { height: 8, borderRadius: radius.full, backgroundColor: colors.accent },
  balanceDetail: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  balanceHint: { color: colors.accentText, fontSize: 13, fontWeight: '600', marginTop: spacing.sm },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', padding: spacing.md, paddingTop: 120 },
  modalBox: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, maxHeight: 350 },
  modalItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalItemText: { color: colors.text, fontSize: 15 },
});
