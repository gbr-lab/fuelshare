// Calcoli: saldi in litri e statistiche mensili

// Fattori per modalità di guida (stime indicative: in città si consuma di più, in extraurbano meno).
// Servono solo a RIPARTIRE i litri tra gli utenti in modo più equo: il totale dei litri dovuti
// resta sempre km totali × consumo medio, quindi i fattori non lo gonfiano né lo riducono.
export const MODE_FACTORS = { Urbano: 1.2, Extraurbano: 0.95, Autostrada: 1.1, Misto: 1.0 };

export function modeFactor(mode) {
  return MODE_FACTORS[mode] ?? 1.0;
}

// Utenti del veicolo: membri attuali + chi compare nello storico (anche se ha lasciato il veicolo)
export function usersFromActivity(trips, refuels, members = []) {
  const map = {};
  for (const m of members) map[m.id] = { id: m.id, name: m.name };
  for (const t of trips) map[t.user_id] = { id: t.user_id, name: t.user_name };
  for (const r of refuels) map[r.user_id] = { id: r.user_id, name: r.user_name };
  return Object.values(map);
}

// Ultimo valore noto del contachilometri: serve a precompilare i km iniziali.
// Prende il valore più alto tra km iniziali del veicolo, fine dei viaggi e km dei rifornimenti
// (di tutti i membri: su un veicolo condiviso il contachilometri è uno solo).
export function lastKnownKm(vehicle, trips, refuels) {
  let km = Number(vehicle?.km_initial) || 0;
  for (const t of trips) if (t.km_end > km) km = t.km_end;
  for (const r of refuels) if (r.km_odometer > km) km = r.km_odometer;
  return km;
}

// Numero senza decimali inutili (150120 invece di 150120.0)
export function fmtKm(n) {
  return String(Math.round(n * 10) / 10);
}

// Chi deve dare litri a chi, con il minor numero possibile di passaggi
export function settlements(balances) {
  const eps = 0.05; // sotto i 0,05 l non serve compensare
  const debtors = balances.filter((b) => b.balance < -eps).map((b) => ({ name: b.name, userId: b.userId, amt: -b.balance })).sort((a, b) => b.amt - a.amt);
  const creditors = balances.filter((b) => b.balance > eps).map((b) => ({ name: b.name, userId: b.userId, amt: b.balance })).sort((a, b) => b.amt - a.amt);
  const out = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const x = Math.min(debtors[i].amt, creditors[j].amt);
    out.push({ fromId: debtors[i].userId, from: debtors[i].name, toId: creditors[j].userId, to: creditors[j].name, liters: x });
    debtors[i].amt -= x; creditors[j].amt -= x;
    if (debtors[i].amt < eps) i++;
    if (creditors[j].amt < eps) j++;
  }
  return out;
}

// Saldi: saldo = litri_pagati - litri_dovuti
export function computeBalances(vehicle, users, trips, refuels) {
  const consumption = vehicle.corrected_consumption || vehicle.declared_consumption || 6;
  const kmByUser = {}, effByUser = {}, paidByUser = {};
  for (const u of users) { kmByUser[u.id] = 0; effByUser[u.id] = 0; paidByUser[u.id] = 0; }
  for (const t of trips) {
    if (kmByUser[t.user_id] === undefined) continue;
    kmByUser[t.user_id] += t.distance;
    effByUser[t.user_id] += t.distance * modeFactor(t.driving_mode);
  }
  for (const r of refuels) { if (paidByUser[r.user_id] !== undefined) paidByUser[r.user_id] += r.liters; }

  const totalKm = Object.values(kmByUser).reduce((a, b) => a + b, 0);
  const totalEff = Object.values(effByUser).reduce((a, b) => a + b, 0);
  const totalDue = (totalKm * consumption) / 100;

  return users.map((u) => {
    const km = kmByUser[u.id] || 0;
    const paid = paidByUser[u.id] || 0;
    const due = totalEff > 0 ? (totalDue * effByUser[u.id]) / totalEff : 0;
    return {
      userId: u.id, name: u.name, km,
      kmPercent: totalKm > 0 ? (km / totalKm) * 100 : 0,
      paid, due, balance: paid - due,
    };
  });
}

// Statistiche degli ultimi 6 mesi (litri stimati dai km, spesa dai rifornimenti con prezzo)
export function monthlyStats(trips, refuels, consumption) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ key, label: d.toLocaleString('it-IT', { month: 'short' }), liters: 0, km: 0, money: 0, hasPrices: false });
  }
  const map = Object.fromEntries(months.map((m) => [m.key, m]));
  for (const t of trips) {
    const m = map[t.date.slice(0, 7)];
    if (m) { m.km += t.distance; m.liters += (t.distance * consumption) / 100; }
  }
  for (const r of refuels) {
    const m = map[r.date.slice(0, 7)];
    if (m && r.price_per_liter) { m.money += r.liters * r.price_per_liter; m.hasPrices = true; }
  }
  return months;
}

// Mese corrente nel fuso del telefono, formato AAAA-MM
export function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatEuro(n) {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}
