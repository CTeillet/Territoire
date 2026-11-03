#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_ROOT"
OUTPUT="$APP_ROOT/build/output"
DERIVED="$APP_ROOT/build/DerivedData"
STAGING="$APP_ROOT/build/package"
mkdir -p "$OUTPUT"

# Restore the source plist even on build failure. No credentials are needed here.
ORIGINAL_PLIST="$(mktemp)"
cp App/Info.plist "$ORIGINAL_PLIST"
trap 'cp "$ORIGINAL_PLIST" "$APP_ROOT/App/Info.plist"; rm -f "$ORIGINAL_PLIST"' EXIT
python3 scripts/configure-info.py App/Info.plist
/usr/bin/plutil -lint App/Info.plist
xcodebuild -version
xcodegen --version
xcodegen generate --spec project.yml

if ! xcodebuild \
  -project TMSPrinterDiagnostic.xcodeproj \
  -scheme TMSPrinterDiagnostic \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -derivedDataPath "$DERIVED" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY= \
  build > "$OUTPUT/build.log" 2>&1; then
  cat "$OUTPUT/build.log"
  exit 1
fi

BUILT_APP="$DERIVED/Build/Products/Release-iphoneos/TMSPrinterDiagnostic.app"
test -x "$BUILT_APP/TMSPrinterDiagnostic"
/usr/bin/plutil -lint "$BUILT_APP/Info.plist"
mkdir -p "$STAGING/Payload"
/usr/bin/ditto "$BUILT_APP" "$STAGING/Payload/TMSPrinterDiagnostic.app"
IPA="$OUTPUT/TMSPrinterDiagnostic-unsigned.ipa"
rm -f "$IPA"
/usr/bin/ditto -c -k --keepParent "$STAGING/Payload" "$IPA"
/usr/bin/unzip -tq "$IPA"
(
  cd "$OUTPUT"
  /usr/bin/shasum -a 256 TMSPrinterDiagnostic-unsigned.ipa > SHA256SUMS.txt
)
cp README.md "$OUTPUT/README.md"
echo "IPA non signé prêt : $IPA"
echo "Cet IPA doit encore être signé et installé avec votre propre compte Apple."
