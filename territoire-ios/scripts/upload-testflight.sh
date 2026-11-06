#!/usr/bin/env bash
# Signs the app with the Apple Distribution certificate and uploads it to TestFlight (internal testers).
# Everything comes from the environment (README, "Installer avec TestFlight"); nothing is left on the runner.
set -euo pipefail

: "${APPLE_TEAM_ID:?manquant (variable GitHub APPLE_TEAM_ID)}"
: "${BUILD_NUMBER:?manquant}"
: "${ASC_KEY_ID:?manquant (variable GitHub APP_STORE_CONNECT_KEY_ID)}"
: "${ASC_ISSUER_ID:?manquant (variable GitHub APP_STORE_CONNECT_ISSUER_ID)}"
: "${ASC_PRIVATE_KEY:?manquant (secret GitHub APP_STORE_CONNECT_PRIVATE_KEY)}"
: "${IOS_DISTRIBUTION_P12_BASE64:?manquant (secret GitHub IOS_DISTRIBUTION_P12_BASE64)}"
: "${IOS_DISTRIBUTION_P12_PASSWORD:?manquant (secret GitHub IOS_DISTRIBUTION_P12_PASSWORD)}"
: "${IOS_APPSTORE_PROFILE_BASE64:?manquant (secret GitHub IOS_APPSTORE_PROFILE_BASE64)}"

fail() {
  echo "$1" >&2
  exit 1
}

[[ "$APPLE_TEAM_ID" =~ ^[A-Z0-9]{10}$ ]] || fail "APPLE_TEAM_ID doit être l'identifiant d'équipe Apple (10 caractères)."
[[ "$ASC_KEY_ID" =~ ^[A-Z0-9]{10}$ ]] || fail "APP_STORE_CONNECT_KEY_ID doit être l'identifiant de la clé d'API (10 caractères)."
[[ "$BUILD_NUMBER" =~ ^[0-9]+(\.[0-9]+){0,2}$ ]] || fail "BUILD_NUMBER invalide : $BUILD_NUMBER"

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_ROOT"
BUNDLE_ID="$(sed -n 's/^ *PRODUCT_BUNDLE_IDENTIFIER: *//p' project.yml)"
[ -n "$BUNDLE_ID" ] || fail "PRODUCT_BUNDLE_IDENTIFIER introuvable dans project.yml."

OUTPUT="$APP_ROOT/build/testflight"
WORK="$(mktemp -d)"
KEYCHAIN="$WORK/signing.keychain-db"
KEYCHAIN_PASSWORD="$(openssl rand -hex 24)"
PROFILE_DIR="$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"
LEGACY_PROFILE_DIR="$HOME/Library/MobileDevice/Provisioning Profiles"
PROFILE_UUID=""
mkdir -p "$OUTPUT"
cp App/Info.plist "$WORK/Info.plist.orig"

cleanup() {
  cp "$WORK/Info.plist.orig" "$APP_ROOT/App/Info.plist"
  security delete-keychain "$KEYCHAIN" >/dev/null 2>&1 || true
  if [ -n "$PROFILE_UUID" ]; then
    rm -f "$PROFILE_DIR/$PROFILE_UUID.mobileprovision" "$LEGACY_PROFILE_DIR/$PROFILE_UUID.mobileprovision"
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

# Temporary keychain holding only the distribution certificate and its private key.
printf '%s' "$IOS_DISTRIBUTION_P12_BASE64" | base64 --decode > "$WORK/distribution.p12"
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
security set-keychain-settings -lut 3600 "$KEYCHAIN"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
security import "$WORK/distribution.p12" -k "$KEYCHAIN" -P "$IOS_DISTRIBUTION_P12_PASSWORD" \
  -A -t cert -f pkcs12 >/dev/null \
  || fail "Import du certificat impossible : vérifier le fichier .p12 et son mot de passe."
security set-key-partition-list -S apple-tool:,apple: -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN" >/dev/null
# shellcheck disable=SC2046 # one keychain path per word, as printed by security.
security list-keychains -d user -s "$KEYCHAIN" $(security list-keychains -d user | tr -d '"')
security find-identity -v -p codesigning "$KEYCHAIN" | grep -q '"Apple Distribution' \
  || fail "Le .p12 ne contient pas de certificat Apple Distribution valide avec sa clé privée."

# App Store provisioning profile for this team and this bundle identifier.
printf '%s' "$IOS_APPSTORE_PROFILE_BASE64" | base64 --decode > "$WORK/profile.mobileprovision"
security cms -D -i "$WORK/profile.mobileprovision" > "$WORK/profile.plist"
PROFILE_UUID="$(/usr/libexec/PlistBuddy -c 'Print :UUID' "$WORK/profile.plist")"
PROFILE_APP_ID="$(/usr/libexec/PlistBuddy -c 'Print :Entitlements:application-identifier' "$WORK/profile.plist")"
PROFILE_EXPIRY="$(/usr/libexec/PlistBuddy -c 'Print :ExpirationDate' "$WORK/profile.plist")"
[[ "$PROFILE_UUID" =~ ^[0-9A-Fa-f-]{36}$ ]] || fail "Profil de provisionnement illisible."
[ "$PROFILE_APP_ID" = "$APPLE_TEAM_ID.$BUNDLE_ID" ] \
  || fail "Le profil est pour $PROFILE_APP_ID, pas pour $APPLE_TEAM_ID.$BUNDLE_ID."
if /usr/libexec/PlistBuddy -c 'Print :ProvisionedDevices' "$WORK/profile.plist" >/dev/null 2>&1; then
  fail "Ce profil liste des appareils (développement ou Ad Hoc) : il faut un profil de distribution App Store Connect."
fi
echo "Profil App Store : $PROFILE_UUID, expire le $PROFILE_EXPIRY"
mkdir -p "$PROFILE_DIR" "$LEGACY_PROFILE_DIR"
cp "$WORK/profile.mobileprovision" "$PROFILE_DIR/$PROFILE_UUID.mobileprovision"
cp "$WORK/profile.mobileprovision" "$LEGACY_PROFILE_DIR/$PROFILE_UUID.mobileprovision"

ASC_KEY_PATH="$WORK/AuthKey_$ASC_KEY_ID.p8"
printf '%s\n' "$ASC_PRIVATE_KEY" > "$ASC_KEY_PATH"

python3 scripts/configure-info.py App/Info.plist
/usr/bin/plutil -lint App/Info.plist
xcodebuild -version
xcodegen generate --spec project.yml

ARCHIVE="$WORK/TMS.xcarchive"
if ! xcodebuild \
  -project TMS.xcodeproj \
  -scheme TMS \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -derivedDataPath "$APP_ROOT/build/DerivedData-testflight" \
  -archivePath "$ARCHIVE" \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  CODE_SIGNING_ALLOWED=YES \
  CODE_SIGN_STYLE=Manual \
  CODE_SIGN_IDENTITY="Apple Distribution" \
  PROVISIONING_PROFILE_SPECIFIER="$PROFILE_UUID" \
  OTHER_CODE_SIGN_FLAGS="--keychain $KEYCHAIN" \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  archive > "$OUTPUT/archive.log" 2>&1; then
  tail -n 200 "$OUTPUT/archive.log"
  fail "La compilation signée a échoué (journal complet : archive.log)."
fi

cat > "$WORK/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>destination</key>
    <string>upload</string>
    <key>teamID</key>
    <string>$APPLE_TEAM_ID</string>
    <key>signingStyle</key>
    <string>manual</string>
    <key>signingCertificate</key>
    <string>Apple Distribution</string>
    <key>provisioningProfiles</key>
    <dict>
        <key>$BUNDLE_ID</key>
        <string>$PROFILE_UUID</string>
    </dict>
    <key>manageAppVersionAndBuildNumber</key>
    <false/>
    <key>testFlightInternalTestingOnly</key>
    <true/>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>
PLIST
/usr/bin/plutil -lint "$WORK/ExportOptions.plist"

if ! xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist "$WORK/ExportOptions.plist" \
  -exportPath "$WORK/export" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$ASC_KEY_PATH" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID" \
  > "$OUTPUT/upload.log" 2>&1; then
  tail -n 200 "$OUTPUT/upload.log"
  fail "L'envoi vers App Store Connect a échoué (journal complet : upload.log)."
fi

VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' App/Info.plist)"
echo "TMS $VERSION ($BUILD_NUMBER) envoyée. Elle apparaît dans TestFlight après le traitement par Apple."
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "## TestFlight"
    echo "TMS **$VERSION ($BUILD_NUMBER)** a été envoyée à App Store Connect, réservée aux testeurs internes."
    echo "Elle arrive dans l'app TestFlight de l'iPhone après le traitement par Apple (souvent 5 à 30 minutes)."
    echo "Le profil App Store expire le $PROFILE_EXPIRY : le renouveler avec le certificat (README de territoire-ios)."
  } >> "$GITHUB_STEP_SUMMARY"
fi
