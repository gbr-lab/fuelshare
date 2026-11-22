import { useMemo } from 'react';
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, SectionList, Alert, Share } from 'react-native';
import { Text, TextInput } from '../components/Typo';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { spacing, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';

export default function GarageScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { vehicles, activeVehicleId, setActiveVehicleId, doShareVehicle, doJoinByCode, doRemoveVehicle } = useApp();
  const [joinCode, setJoinCode] = useState('');

  const personal = vehicles.filter((v) => !v.is_shared);
  const shared = vehicles.filter((v) => !!v.is_shared);

  const sections = [
    ...(personal.length || true ? [{ title: 'Veicoli personali', data: personal }] : []),
    { title: 'Veicoli condivisi', data: shared },
  ];

  const onShare = (item) => {
    Alert.alert(
      'Condividi veicolo',
      `Chiunque inserisca il codice (o apra il link) vedrà lo storico di "${item.name}" e avrà gli stessi tuoi permessi. Vuoi generare il codice di condivisione?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Condividi',
          onPress: () => {
            const code = doShareVehicle(item.id);
            Share.share({ message: `Unisciti al mio veicolo "${item.name}" su FuelShare!\nCodice: ${code}\nLink: fuelshare://join/${code}` });
          },
        },
      ]
    );
  };

  const onRemove = (item) => {
    if (item.is_shared) {
      Alert.alert(
        'Rimuovi veicolo condiviso',
        `"${item.name}" sparirà dalla tua lista, ma resterà visibile agli altri membri. Se TUTTI lo rimuovono, verrà eliminato definitivamente dopo 48 ore. Vuoi procedere?`,
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Rimuovi', style: 'destructive', onPress: () => doRemoveVehicle(item.id) },
        ]
      );
    } else {
      Alert.alert(
        'Elimina veicolo',
        `"${item.name}" e TUTTI i suoi dati (viaggi, rifornimenti, saldi) verranno eliminati definitivamente. Questa azione non può essere annullata. Vuoi procedere?`,
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Elimina definitivamente', style: 'destructive', onPress: () => doRemoveVehicle(item.id) },
        ]
      );
    }
  };

  const onJoin = () => {
    if (!joinCode.trim()) return;
    try {
      const v = doJoinByCode(joinCode);
      Alert.alert('Fatto!', `Ora fai parte del veicolo condiviso "${v.name}".`);
      setJoinCode('');
    } catch (e) {
      Alert.alert('Errore', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setActiveVehicleId(item.id)} activeOpacity={0.8}>
            <View style={[styles.card, item.is_shared && styles.cardShared, item.id === activeVehicleId && styles.cardActive]}>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                  {!!item.is_shared && (
                    <View style={styles.sharedBadge}>
                      <Ionicons name="people-outline" size={12} color={colors.background} />
                      <Text style={styles.sharedBadgeText}>Condiviso</Text>
                    </View>
                  )}
                  {item.id === activeVehicleId && <Ionicons name="checkmark-circle" size={18} color={colors.accent} />}
                </View>
                <Text style={styles.cardSub}>
                  {item.fuel_type} · serbatoio {item.tank_capacity} l · {Number(item.corrected_consumption).toFixed(1)} l/100km
                </Text>
                {!!item.share_code && <Text style={styles.codeText}>codice: {item.share_code}</Text>}
              </View>
              <View style={styles.cardActions}>
                {item.is_shared ? (
                  <TouchableOpacity style={styles.iconBtn} onPress={() => Share.share({ message: `Unisciti al mio veicolo "${item.name}" su FuelShare!\nCodice: ${item.share_code}\nLink: fuelshare://join/${item.share_code}` })}>
                    <Ionicons name="share-social-outline" size={20} color={colors.accent} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.iconBtn} onPress={() => onShare(item)}>
                    <Ionicons name="people-outline" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.iconBtn} onPress={() => onRemove(item)}>
                  <Ionicons name="trash-outline" size={20} color={colors.red} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title} ({section.data.length})</Text>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="car-sport-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Garage vuoto</Text>
          </View>
        }
        ListFooterComponent={
          <View>
            <View style={styles.joinBox}>
              <Text style={styles.joinTitle}>Unisciti a un veicolo condiviso</Text>
              <View style={styles.joinRow}>
                <TextInput
                  style={styles.joinInput}
                  placeholder="Inserisci codice (es. K7Q2XM)"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  value={joinCode}
                  onChangeText={setJoinCode}
                />
                <TouchableOpacity style={styles.joinButton} onPress={onJoin}>
                  <Text style={styles.joinButtonText}>Unisciti</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddVehicle')}>
              <Ionicons name="add" size={20} color="#121417" />
              <Text style={styles.addButtonText}>Aggiungi veicolo</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  sectionHeader: { color: colors.textMuted, fontSize: 13, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  card: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  cardShared: { borderLeftWidth: 3, borderLeftColor: colors.green },
  cardActive: { borderColor: colors.accent },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700', flexShrink: 1 },
  cardSub: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  codeText: { color: colors.accentText, fontSize: 12, fontWeight: '600', marginTop: 4 },
  sharedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.green, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2,
  },
  sharedBadgeText: { color: colors.background, fontSize: 10, fontWeight: '800' },
  cardActions: { flexDirection: 'row', gap: spacing.xs },
  iconBtn: { padding: spacing.sm },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { color: colors.textMuted, marginTop: spacing.sm },
  joinBox: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md, borderWidth: 1, borderColor: colors.border },
  joinTitle: { color: colors.text, fontWeight: '700', marginBottom: spacing.sm },
  joinRow: { flexDirection: 'row', gap: spacing.sm },
  joinInput: {
    flex: 1, backgroundColor: colors.inputBg, color: colors.text, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  joinButton: { backgroundColor: colors.green, borderRadius: radius.sm, paddingHorizontal: spacing.md, justifyContent: 'center' },
  joinButtonText: { color: '#121417', fontWeight: '800' },
  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.accent, marginTop: spacing.md, borderRadius: radius.md, paddingVertical: 15,
  },
  addButtonText: { color: '#121417', fontWeight: '800', fontSize: 16 },
});
