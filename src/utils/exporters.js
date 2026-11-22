// Esportazione CSV / PDF e importazione CSV
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import { computeBalances, usersFromActivity, currentMonthKey } from './calc';

function esc(v) {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Protegge l'HTML dei PDF da caratteri speciali nei nomi
function h(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function safeName(s) {
  return String(s || 'veicolo').replace(/\W+/g, '_');
}

// Garantisce lo schema file:// (senza, Android rifiuta la condivisione)
function fileUri(uri) {
  if (!uri) throw new Error('Percorso file non valido.');
  return uri.startsWith('file://') ? uri : 'file://' + uri;
}

async function share(uri, mimeType, dialogTitle) {
  const fixed = fileUri(uri);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Condivisione non disponibile su questo dispositivo.');
  await Sharing.shareAsync(fixed, { mimeType, dialogTitle });
}

// ---------- CSV ----------
export async function exportCsv(vehicle, trips, refuels) {
  const lines = ['type,date,user,km_start,km_end,distance,mode,liters,price_per_liter,km_odometer'];
  for (const t of trips) {
    lines.push(['trip', t.date, t.user_name, t.km_start, t.km_end, t.distance.toFixed(1), t.driving_mode, '', '', ''].map(esc).join(','));
  }
  for (const r of refuels) {
    lines.push(['refuel', r.date, r.user_name, '', '', '', '', r.liters.toFixed(2), r.price_per_liter ?? '', r.km_odometer].map(esc).join(','));
  }
  const uri = `${FileSystem.cacheDirectory}${safeName(vehicle.name)}_export.csv`;
  await FileSystem.writeAsStringAsync(uri, lines.join('\n'));
  await share(uri, 'text/csv', 'Esporta CSV');
}

// ---------- PDF ----------
function htmlShell(title, subtitle, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { margin: 22mm 16mm; }
    body{font-family:Helvetica,Arial,sans-serif;color:#14181f;font-size:12px}
    .brand{color:#b26a00;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase}
    h1{font-size:22px;margin:6px 0 2px 0}
    .sub{color:#6b7280;font-size:12px;margin-bottom:18px}
    h2{font-size:13px;color:#14181f;border-bottom:2px solid #f5a000;padding-bottom:4px;margin:26px 0 8px 0}
    .summary{width:100%;border-collapse:separate;border-spacing:8px 0;margin:0 -8px}
    .summary td{background:#f4f5f7;border-radius:6px;padding:10px 12px;border:0}
    .summary .v{font-size:16px;font-weight:bold;display:block}
    .summary .l{color:#6b7280;font-size:10px}
    table.data{width:100%;border-collapse:collapse}
    table.data th{text-align:left;font-size:10px;color:#6b7280;text-transform:uppercase;padding:6px 8px;border-bottom:1px solid #d9dde3}
    table.data td{padding:6px 8px;border-bottom:1px solid #eceef2}
    .pos{color:#2e7d32;font-weight:bold}.neg{color:#c62828;font-weight:bold}
    .foot{margin-top:28px;color:#9aa0aa;font-size:10px}
  </style></head><body>
    <div class="brand">FuelShare</div><h1>${h(title)}</h1><div class="sub">${h(subtitle)}</div>${body}
    <div class="foot">Generato da FuelShare il ${new Date().toLocaleDateString('it-IT')}</div>
  </body></html>`;
}

function buildPdfHtml(vehicle, trips, refuels, monthOnly) {
  const monthKey = currentMonthKey();
  const t = monthOnly ? trips.filter((x) => x.date.startsWith(monthKey)) : trips;
  const r = monthOnly ? refuels.filter((x) => x.date.startsWith(monthKey)) : refuels;
  const unit = vehicle.fuel_type === 'Elettrico' ? 'kWh' : 'l';

  const totalKm = t.reduce((s, x) => s + x.distance, 0);
  const totalL = r.reduce((s, x) => s + x.liters, 0);
  const totalEur = r.reduce((s, x) => s + (x.price_per_liter ? x.liters * x.price_per_liter : 0), 0);

  const balances = computeBalances(vehicle, usersFromActivity(t, r), t, r);
  const balRows = balances.map((b) =>
    `<tr><td>${h(b.name)}</td><td>${b.km.toFixed(0)} km (${b.kmPercent.toFixed(0)}%)</td><td>${b.due.toFixed(1)} ${unit}</td><td>${b.paid.toFixed(1)} ${unit}</td><td class="${b.balance >= 0 ? 'pos' : 'neg'}">${b.balance >= 0 ? '+' : ''}${b.balance.toFixed(1)} ${unit}</td></tr>`).join('');
  const tripRows = t.map((x) =>
    `<tr><td>${h(x.date)}</td><td>${h(x.user_name)}</td><td>${x.km_start}</td><td>${x.km_end}</td><td>${x.distance.toFixed(1)} km</td><td>${h(x.driving_mode)}</td></tr>`).join('');
  const refuelRows = r.map((x) =>
    `<tr><td>${h(x.date)}</td><td>${h(x.user_name)}</td><td>${x.liters.toFixed(2)} ${unit}</td><td>${x.km_odometer}</td><td>${x.price_per_liter ? x.price_per_liter.toFixed(3) + ' €/l' : '—'}</td></tr>`).join('');

  const body = `
    <table class="summary"><tr>
      <td><span class="v">${totalKm.toFixed(1)} km</span><span class="l">Distanza</span></td>
      <td><span class="v">${totalL.toFixed(1)} ${unit}</span><span class="l">Rifornito</span></td>
      <td><span class="v">${totalEur.toFixed(2)} €</span><span class="l">Spesa (dove indicato il prezzo)</span></td>
      <td><span class="v">${Number(vehicle.corrected_consumption).toFixed(1)}</span><span class="l">${unit}/100km corretto</span></td>
    </tr></table>
    <h2>Saldi (${unit})</h2>
    <table class="data"><tr><th>Utente</th><th>Km</th><th>Dovuti</th><th>Pagati</th><th>Saldo</th></tr>${balRows || '<tr><td colspan="5">Nessun dato</td></tr>'}</table>
    <h2>Viaggi (${t.length})</h2>
    <table class="data"><tr><th>Data</th><th>Utente</th><th>Km inizio</th><th>Km fine</th><th>Distanza</th><th>Modalità</th></tr>${tripRows || '<tr><td colspan="6">Nessun viaggio</td></tr>'}</table>
    <h2>Rifornimenti (${r.length})</h2>
    <table class="data"><tr><th>Data</th><th>Utente</th><th>Quantità</th><th>Km conta</th><th>Prezzo</th></tr>${refuelRows || '<tr><td colspan="5">Nessun rifornimento</td></tr>'}</table>`;

  return htmlShell(
    `${monthOnly ? 'Report mensile' : 'Report completo'} — ${vehicle.name}`,
    monthOnly ? `Mese ${monthKey}` : 'Tutto lo storico del veicolo',
    body
  );
}

export async function exportPdf(vehicle, trips, refuels, monthOnly = false) {
  const html = buildPdfHtml(vehicle, trips, refuels, monthOnly);
  let stage = 'creazione del PDF';
  try {
    const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
    stage = 'preparazione del file';
    const dest = `${FileSystem.cacheDirectory}${safeName(vehicle.name)}_${monthOnly ? 'mensile' : 'completo'}.pdf`;
    await FileSystem.deleteAsync(dest, { idempotent: true });
    await FileSystem.copyAsync({ from: uri, to: dest });
    stage = 'condivisione';
    await share(dest, 'application/pdf', 'Condividi PDF');
  } catch (e) {
    // Piano B: apre la finestra di stampa di Android, da cui si può "Salva come PDF"
    try {
      await Print.printAsync({ html });
    } catch (e2) {
      throw new Error(`PDF non riuscito (fase: ${stage}).\n${e?.message || e}\n\nAnche la stampa di riserva ha fallito:\n${e2?.message || e2}`);
    }
  }
}

// ---------- IMPORT CSV ----------
// Formato atteso (intestazione obbligatoria):
// type,date,user,km_start,km_end,distance,mode,liters,price_per_liter
export async function importCsv() {
  const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (res.canceled || !res.assets || res.assets.length === 0) return null;
  const asset = res.assets[0];
  if (!asset.uri) return null;
  const text = await FileSystem.readAsStringAsync(asset.uri);
  const parsed = Papa.parse(text.trim(), { header: true, skipEmptyLines: true });
  if (!parsed.meta.fields || !parsed.meta.fields.includes('type') || !parsed.meta.fields.includes('date')) {
    throw new Error('Formato CSV non valido: manca la riga di intestazione.');
  }
  const trips = [], refuels = [];
  for (const row of parsed.data) {
    if (!row || !row.type || !row.date) continue;
    if (row.type === 'trip') {
      const kmStart = parseFloat(row.km_start), kmEnd = parseFloat(row.km_end);
      if (isNaN(kmStart) || isNaN(kmEnd) || kmEnd < kmStart) continue;
      trips.push({ date: row.date, kmStart, kmEnd, drivingMode: row.mode || 'Misto' });
    } else if (row.type === 'refuel') {
      const liters = parseFloat(row.liters);
      if (isNaN(liters) || liters <= 0) continue;
      refuels.push({ date: row.date, liters, kmOdometer: parseFloat(row.km_odometer || row.distance || 0) || 0, pricePerLiter: row.price_per_liter ? parseFloat(row.price_per_liter) : null });
    }
  }
  const invalid = parsed.data.length - trips.length - refuels.length;
  return { trips, refuels, invalid, fileName: asset.name || asset.uri.split('/').pop() || 'file.csv' };
}
