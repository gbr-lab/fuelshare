import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../components/Typo';
import Avatar from '../components/Avatar';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { spacing, radius, userColor } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { usersFromActivity } from '../utils/calc';

const PAGE = 20;

function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function FillUpScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, activeVehicle, trips, refuels, members } = useApp();
  const [filter, setFilter] = useState('all'); // 'all' | 'me' | id utente
  const [limit, setLimit] = useState(PAGE);

  if (!activeVehicle) {
    return (
      <View style={styles.center}>
        <Ionicons name="water-outline" size={48} color={colors.textMuted} />
        <Text style={styles.infoTitle}>Nessun veicolo attivo</Text>
        <Text style={styles.infoSub}>Aggiungi un veicolo dal tab Garage.</Text>
      </View>
    );
  }

  const shared = !!activeVehicle.is_shared;
  const people = usersFromActivity(trips, refuels, members);
  const others = people.filter((p) => p.id !== user.id);

  const all = [
    ...trips.map((t) => ({ ...t, kind: 'trip' })),
    ...refuels.map((r) => ({ ...r, kind: 'refuel' })),
  ].sort((a, b) => (b.date + String(b.id).padStart(9, '0')).localeCompare(a.date + String(a.id).padStart(9, '0')));

  const filtered = all.filter((i) => filter === 'all' ? true : filter === 'me' ? i.user_id === user.id : i.user_id === filter);
  const visible = filtered.slice(0, limit);

  // intestazioni per giorno
  const rows = [];
  let lastDay = null;
  for (const item of visible) {
    if (item.date !== lastDay) { rows.push({ header: item.date }); lastDay = item.date; }
    rows.push(item);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.accent }]} onPress={() => navigation.navigate('AddTrip')}>
        <Ionicons name="navigate-outline" size={18} color="#121417" />
        <Text style={styles.actionText}>Registra viaggio</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.green }]} onPress={() => navigation.navigate('AddRefuel')}>
        <Ionicons name="water-outline" size={18} color="#121417" />
        <Text style={styles.actionText}>Registra rifornimento</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Storico attività</Text>

      {/* Filtro per persona (solo veicoli condivisi) */}
      {shared && others.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
          <Chip styles={styles} active={filter === 'all'} label="Tutti" onPress={() => { setFilter('all'); setLimit(PAGE); }} />
          <Chip styles={styles} active={filter === 'me'} label="Solo io" color={userColor(user.id)} onPress={() => { setFilter('me'); setLimit(PAGE); }} />
          {others.map((p) => (
            <Chip key={p.id} styles={styles} active={filter === p.id} label={p.name} color={userColor(p.id)} onPress={() => { setFilter(p.id); setLimit(PAGE); }} />
          ))}
        </ScrollView>
      )}

      {rows.length === 0 && <Text style={styles.infoSub}>Nessuna attività {filter === 'all' ? 'registrata su questo veicolo' : 'per questo filtro'}.</Text>}

      {rows.map((item, idx) => {
        if (item.header) return <Text key={'h' + item.header} style={styles.dayHeader}>{fmtDate(item.header)}</Text>;
        const mine = item.user_id === user.id;
        const c = userColor(item.user_id);
        const isRefuel = item.kind === 'refuel';
        return (
          <View key={item.kind + item.id} style={[
            styles.rowItem,
            shared && { borderLeftWidth: 4, borderLeftColor: c },
            shared && mine && { backgroundColor: colors.inputBg },
          ]}>
            {shared ? <Avatar id={item.user_id} name={item.user_name} size={34} /> : (
              <Ionicons name={isRefuel ? 'water-outline' : 'navigate-outline'} size={22} color={isRefuel ? colors.green : colors.accent} />
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.titleLine}>
                <Text style={styles.rowText}>
                  {isRefuel
                    ? `${item.liters.toFixed(1)} l${item.price_per_liter ? ` · ${item.price_per_liter.toFixed(3)} €/l` : ''}`
                    : `${item.distance.toFixed(1)} km · ${item.driving_mode}`}
                </Text>
              </View>
              {shared && (
                <View style={styles.whoLine}>
                  <Text style={[styles.who, { color: c }]}>{item.user_name}</Text>
                  {mine && <View style={[styles.badge, { backgroundColor: c }]}><Text style={styles.badgeText}>TU</Text></View>}
                  <Ionicons name={isRefuel ? 'water-outline' : 'navigate-outline'} size={13} color={colors.textMuted} />
                  <Text style={styles.rowSub}>{isRefuel ? 'rifornimento' : 'viaggio'}</Text>
                </View>
              )}
              <Text style={styles.rowSub}>
                {isRefuel ? `contachilometri ${Math.round(item.km_odometer)} km` : `da ${Math.round(item.km_start)} a ${Math.round(item.km_end)} km`}
              </Text>
            </View>
          </View>
        );
      })}

      {filtered.length > limit && (
        <TouchableOpacity style={styles.more} onPress={() => setLimit((l) => l + PAGE)}>
          <Text style={styles.moreText}>Mostra altre ({filtered.length - limit})</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function Chip({ styles, active, label, color, onPress }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.8}>
      {color && <View style={[styles.dot, { backgroundColor: color }]} />}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  infoTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.sm },
  infoSub: { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    borderRadius: radius.md, paddingVertical: 15, marginBottom: spacing.sm,
  },
  actionText: { color: '#121417', fontWeight: '800', fontSize: 15 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm },
  dayHeader: { color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.sm, marginBottom: spacing.xs },
  rowItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card,
    borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  titleLine: { flexDirection: 'row', alignItems: 'center' },
  whoLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  who: { fontSize: 13, fontWeight: '800' },
  badge: { borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  rowText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  rowSub: { color: colors.textMuted, fontSize: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 7, marginRight: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#121417', fontWeight: '800' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  more: { alignItems: 'center', paddingVertical: spacing.md },
  moreText: { color: colors.accentText, fontWeight: '700' },
});
