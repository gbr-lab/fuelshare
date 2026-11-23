#!/usr/bin/env bash
# Build di release locale: genera fuelshare-X.Y.Z.apk pronto per GitHub Releases.
# Uso: ./build-release.sh   (dalla root del progetto)
set -euo pipefail

VERSION=$(node -p "require('./app.json').expo.version")
OUT="fuelshare-${VERSION}.apk"

echo "==> Build release v${VERSION} (locale, gratuita)"
# --local = build sul tuo PC, niente quota cloud. NON rimuoverlo.
eas build --platform android --profile production --local --output "${OUT}"

echo
echo "==> Fatto: ${OUT}"
echo "    Prossimi passi:"
echo "    adb install ${OUT}   # test sul telefono"
echo "    git tag v${VERSION} && git push origin v${VERSION}"
echo "    poi crea la GitHub Release allegando ${OUT}"
