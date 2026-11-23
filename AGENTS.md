FuelShare è un'app mobile Expo / React Native (JavaScript, non TypeScript), 100% offline con database SQLite locale. Dare priorità a pattern mobile-first, prestazioni e compatibilità Android (target principale).

## Expo cambia spesso — non fidarti della memoria

Expo introduce breaking change a ogni SDK. Prima di scrivere codice che tocca API Expo, EAS o React Native:

1. Leggi la versione major di `expo` in `package.json` (attualmente SDK 58).
2. Consulta la documentazione versionata: `https://docs.expo.dev/versions/v58.0.0/`
3. Per il resto usa l'indice https://docs.expo.dev/llms.txt e segui i link alla pagina specifica.

## Comandi

Il progetto usa **npm** (`package-lock.json`), non bun.

```bash
npm install
npx expo install <package>  # SEMPRE al posto di npm add: sceglie la versione compatibile con l'SDK
npx expo start -c           # dev server (-c svuota la cache)
npx expo-doctor             # diagnosi di dipendenze e configurazione
npx expo install --fix      # allinea le versioni incompatibili
```

Non esistono script di lint né di typecheck (nessun TypeScript/ESLint configurato). Prima di dichiarare finito un lavoro: `npx expo-doctor` e verifica che `npx expo start -c` parta senza errori.

## Architettura

- `index.js` → `App.js`: provider (`SafeAreaProvider` → `ThemeProvider` → `AppProvider`) e navigazione.
- **Navigazione: React Navigation** (`@react-navigation/native` + `native-stack`), NON Expo Router. Non esiste `src/app/`.
  - `AuthStack`: Login / Register / ForgotPassword (utente non autenticato).
  - `MainStack`: `Tabs` + schermate modali (Settings, AddVehicle, AddTrip, AddRefuel, SelectiveClear).
  - `Tabs` è una `PagerView` personalizzata con barra in basso (`TABS` in `App.js`): Overview, FillUp (storico + pulsanti di registrazione), Garage, Service (export/import/pulizia dati).
- `src/context/AppContext.js`: stato globale (utente, veicoli, viaggi, rifornimenti) e azioni; unico punto che parla con il database.
- `src/db/database.js`: schema SQLite (`expo-sqlite`, API sincrone), migrazioni, query.
- `src/utils/calc.js`: saldi in litri, compensazioni, statistiche mensili.
- `src/utils/security.js`: hash password (scrypt), sessioni, codice di recupero, validazioni.
- `src/utils/exporters.js`: export CSV/PDF e import CSV.

## Modello dati (importante)

Tutti i dati stanno nel SQLite del singolo telefono. Non c'è sincronizzazione: un "veicolo condiviso" (codice/link `fuelshare://join/CODICE`) funziona solo tra account presenti **sullo stesso dispositivo**. La sincronizzazione tra telefoni diversi è prevista nella Fase 4 (cloud, Supabase) e non è ancora implementata.

## Build con EAS

Le release si producono in locale con `./build-release.sh` (`eas build --local`), vedi `RELEASE_CHECKLIST.md`. Esegui l'EAS CLI come `npx eas-cli@latest <comando>` oppure con `eas` se installato globalmente.
Docs: https://docs.expo.dev/eas/index.md

## Regole

- Le cartelle `ios/` e `android/` non esistono: sono generate (Continuous Native Generation). Non crearle né modificarle a mano; configura il comportamento nativo in `app.json` e nei config plugin.
- Expo Go include solo i moduli nativi inclusi nell'SDK. Dopo aver aggiunto una libreria con codice nativo serve una development build: `npx expo run:android` in locale, oppure `eas build --profile development`.
- Preferisci i moduli Expo consigliati alle librerie di terze parti. Docs: https://docs.expo.dev/versions/v58.0.0/
- Non committare mai keystore, `credentials.json` o file `.env` (già in `.gitignore`).
