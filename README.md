# FuelShare

Condividi i costi di carburante e manutenzione quando viaggi in gruppo con un veicolo condiviso. Tutto locale, nessun account cloud, nessun tracciamento.

## Funzionalità

- **Garage multi-veicolo**: gestisci più veicoli e passa dall'uno all'altro.
- **Veicoli condivisi (stesso dispositivo)**: più account sullo stesso telefono possono usare lo stesso veicolo tramite codice. La condivisione tra telefoni diversi arriverà con il cloud (Fase 4).
- **Viaggi con contachilometri**: registrazione km iniziali/finali, con suggerimenti automatici basati sull'ultimo valore noto.
- **Rifornimenti**: quantità, prezzo, km — con calcolo del consumo.
- **Bilanci del gruppo**: chi ha pagato, chi ha guidato, quota km di ciascuno, compensazioni per pareggiare i conti.
- **Panoramica mensile**: grafico spese e saldi del mese.
- **Manutenzione**: registro interventi per veicolo.
- **Export CSV**: viaggi, rifornimenti e bilanci esportabili e condivisibili.
- **Sicurezza locale**: password con hash lento e salt, blocco anti-tentativi, sessioni con scadenza, codice di recupero password (mostrato una sola volta, conservalo!).
- **100% offline**: i dati vivono nel database SQLite sul tuo telefono.

## Privacy

FuelShare non raccoglie, trasmette o condivide alcun dato. Nessun server, nessuna analitica, nessun SDK di terze parti. I dati restano nel telefono; l'unico modo per farli uscire è l'export CSV che avvii tu.

## Installazione (utenti)

### Con Obtainium (consigliato — aggiornamenti automatici)

1. Installa [Obtainium](https://github.com/ImranR98/Obtainium) sul telefono.
2. Aggiungi questo repository: `https://github.com/gbr-lab/fuelshare`.
3. Installa e ricevi gli aggiornamenti automaticamente ad ogni release.

### Download manuale

Scarica l'APK dall'ultima [Release](../../releases/latest) e aprilo sul telefono (Android richiede di autorizzare l'installazione da "origini sconosciute" la prima volta).

> ⚠️ Minimo richiesto: Android 8.0 (API 26) — *da verificare con la prima build*.

## Sviluppo

```bash
git clone https://github.com/gbr-lab/fuelshare.git
cd fuelshare
npm install
npx expo start -c
```

### Build dell'APK in locale (Linux/Fedora)

Prerequisiti una tantum: JDK 17 e Android SDK (cmdline-tools, platform-tools, piattaforma Android, build-tools) — vedi la [documentazione EAS sui local builds](https://docs.expo.dev/build-reference/local-builds/).

```bash
npm install -g eas-cli
eas login                    # account Expo gratuito
./build-release.sh           # produce fuelshare-X.Y.Z.apk nella root del progetto
adb install fuelshare-X.Y.Z.apk
```

## Rilasci

Ogni release segue la checklist in [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).

## Roadmap

- [x] Grafico statistiche consumo (barre mensili in Overview)
- [~] Backup/ripristino: l'import CSV ricostruisce solo viaggi e rifornimenti (senza utente originale, veicoli e saldi). Il backup completo è ancora da fare
- [ ] Condivisione veicolo tra telefoni diversi (oggi il codice funziona solo tra account sullo stesso dispositivo)
- [ ] Fase 4 — cloud (Supabase): sincronizzazione di gruppo, recupero password via email, 2FA *(l'app resterà usabile offline)*
- [ ] Pubblicazione Play Store

## Licenza

Vedere [LICENSE](LICENSE).
