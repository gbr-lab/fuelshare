# Checklist di rilascio

Leggere tutto prima di iniziare. I punti ⚠️ sono irreversibili se sbagliati.

## Preparazione (una sola volta)

- [ ] ⚠️ `android.package` in `app.json` è definitivo: `com.github.gbrlab.fuelshare` (già impostato in `app.json`). NON cambiarlo mai più dopo la prima release pubblica.
- [ ] ⚠️ Keystore: dopo il primo `eas build`, esegui `eas credentials`, seleziona Android → production e **scarica il keystore**. Salvalo in LUOGO SICURO (password manager + chiavetta). Se lo perdi, gli utenti non potranno MAI più aggiornare l'app: Android rifiuta aggiornamenti firmati con un certificato diverso. NON committarlo (è già nel .gitignore).

## Ad ogni release

1. [ ] Chiudi tutti i TODO aperti e verifica che `npx expo start -c` non dia errori.
2. [ ] Test sul telefono **dell'APK release**, non di Expo Go: installa, usa tutte le schermate, spegni/riaccendi l'app, verifica che l'export CSV funzioni.
3. [ ] In `app.json` incrementa sia `version` (es. 1.0.1) sia `android.versionCode` (es. 2). Il versionCode DEVE crescere ad ogni release o Android/Obtainium non riconosceranno l'aggiornamento.
4. [ ] `./build-release.sh` → verifica che l'APK venga prodotto e si installi.
5. [ ] `git add -A && git commit -m "Release X.Y.Z" && git tag vX.Y.Z && git push origin main --tags`
6. [ ] GitHub → Releases → Create release from tag `vX.Y.Z`:
     - Titolo: `FuelShare X.Y.Z`
     - Allega `fuelshare-X.Y.Z.apk`
     - Note: cosa c'è di nuovo / corretto (basta qualche riga onesta)
7. [ ] Con Obtainium sul telefono, verifica che l'aggiornamento venga rilevato e installato (testa su un secondo telefono con la versione precedente, se puoi).

## Se qualcosa va male

- **L'APK non si installa sopra la versione vecchia** → firma diversa: usi un keystore diverso da quello della release precedente. Recupera il keystore originale da backup.
- **Obtainium non vede l'aggiornamento** → controlla versionCode incrementato e che l'APK sia allegato alla Release (non ad un semplice tag).
