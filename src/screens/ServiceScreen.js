import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Typo';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { exportCsv, exportPdf, importCsv } from '../utils/exporters';
import { spacing, radius } from '../theme';

const ITEMS = [
  { key: 'csv', icon: 'download-outline', title: 'Esporta CSV', sub: 'Viaggi e rifornimenti del veicolo attivo, in formato foglio di calcolo' },
  { key: 'pdf', icon: 'document-text-outline', title: 'Report completo PDF', sub: 'Riepilogo con saldi, viaggi e rifornimenti di tutto lo storico' },
  { key: 'pdfm', icon: 'calendar-outline', title: 'Report mensile PDF', sub: 'Solo le attività del mese corrente, pronte da condividere' },
  { key: 'import', icon: 'cloud-upload-outline', title: 'Importa CSV', sub: 'Carica viaggi e rifornimenti da un file esportato in precedenza' },
  { key: 'clear', icon: 'trash-bin-outline', title: 'Elimina dati selezionati', sub: 'Scegli quali voci eliminare dallo storico del veicolo attivo' },
  { key: 'clearall', icon: 'warning-outline', title: 'Cancella tutti i dati', sub: 'Elimina tutti i tuoi veicoli, viaggi e rifornimenti (l’account resta)', danger: true },
];

export default function ServiceScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { activeVehicle, trips, refuels, importRows, clearAll } = useApp();
  const [busy, setBusy] = useState(false);

  const run = async (key) => {
    if (busy) return;
    if (key !== 'clearall' && !activeVehicle) {
      return Alert.alert('Nessun veicolo attivo', 'Aggiungi e seleziona un veicolo dal tab Garage.');
    }
    try {
      if (key === 'csv' || key === 'pdf' || key === 'pdfm') {
        setBusy(true);
        try {
          if (key === 'csv') await exportCsv(activeVehicle, trips, refuels);
          else await exportPdf(activeVehicle, trips, refuels, key === 'pdfm');
        } finally {
          setBusy(false);
        }
      } else if (key === 'import') {
        const res = await importCsv();
        if (!res) return;
        Alert.alert(
          'Importa CSV',
          `File: ${res.fileName}\nViaggi trovati: ${res.trips.length}\nRifornimenti trovati: ${res.refuels.length}${res.invalid > 0 ? `\nRighe ignorate: ${res.invalid}` : ''}\n\nVuoi importarli nel veicolo attivo (${activeVehicle.name})?`,
          [
            { text: 'Annulla', style: 'cancel' },
            { text: 'Importa', onPress: () => { importRows(res.trips, res.refuels); Alert.alert('Fatto', 'Import completato.'); } },
          ]
        );
      } else if (key === 'clear') {
        navigation.navigate('SelectiveClear');
      } else if (key === 'clearall') {
        Alert.alert('Cancella TUTTI i dati', 'Verranno eliminati tutti i tuoi veicoli privati, viaggi e rifornimenti. I veicoli condivisi degli altri non vengono toccati. L’account resta attivo. Sei sicuro?', [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Sì, cancella tutto', style: 'destructive', onPress: () => { clearAll(); Alert.alert('Fatto', 'Tutti i tuoi dati sono stati cancellati.'); } },
        ]);
      }
    } catch (e) {
      Alert.alert('Errore', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {ITEMS.map((item) => (
          <TouchableOpacity key={item.key} style={[styles.item, item.danger && styles.itemDanger]} onPress={() => run(item.key)} activeOpacity={0.7}>
            <Ionicons name={item.icon} size={24} color={item.danger ? colors.red : colors.accentText} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, item.danger && { color: colors.red }]}>{item.title}</Text>
              <Text style={styles.itemSub}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
        <Text style={styles.note}>I file vengono condivisi tramite il menu del telefono (WhatsApp, email, Drive…) e non lasciano mai il dispositivo se non li condividi.</Text>
      </ScrollView>

      {busy && (
        <View style={styles.busy}>
          <View style={styles.busyBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.busyText}>Preparo il file…</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  itemDanger: { borderColor: colors.red },
  itemTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  itemSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  note: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: spacing.md, paddingHorizontal: spacing.lg },
  busy: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  busyBox: { backgroundColor: colors.card, borderRadius: radius.lg, paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, alignItems: 'center', gap: spacing.sm },
  busyText: { color: colors.text, fontWeight: '600' },
});
