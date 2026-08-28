#!/usr/bin/env bash
# ============================================================
# repack_apk.sh — Re-empaqueta la APK base release con:
#   package, nombre (label), icono y token cifrado por usuario.
#
# Uso:
#   APK_TOKEN_KEY="<clave-maestra>" ./repack_apk.sh \
#       --apk   /ruta/app-release-unsigned.apk \
#       --pkg   com.mxtunnel.app.usuario \
#       --name  "MXTunnel - Usuario" \
#       --icon  /ruta/icono.png \
#       --token 1a911475-5a83-4119-909d-e8010b75d6e3 \
#       --out   /ruta/salida.apk
#
# Requisitos: apktool (APKTOOL_JAR o en PATH), apksigner, zipalign,
#             keystore stunnel_key.jks, python3 + 'cryptography'.
# ============================================================
set -euo pipefail

# --- Configuración (variables de entorno, con fallbacks) ---
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYSTORE="${APK_KEYSTORE:-$BASE_DIR/../app/mxtunnel_key.jks}"
KS_PASS="${APK_KS_PASS:-owEGeLpr2xxfLqOWXJpy9fM6}"
KS_ALIAS="${APK_KS_ALIAS:-mxtunnel}"
APKTOOL_JAR="${APKTOOL_JAR:-$HOME/.local/share/apktool/apktool.jar}"
SDK_BUILD_TOOLS="${SDK_BUILD_TOOLS:-$HOME/Android/Sdk/build-tools/37.0.0}"

# --- Argumentos ---
APK=""; PKG=""; NAME=""; ICON=""; TOKEN=""; OUT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --apk) APK="$2"; shift 2;;
    --pkg) PKG="$2"; shift 2;;
    --name) NAME="$2"; shift 2;;
    --icon) ICON="$2"; shift 2;;
    --token) TOKEN="$2"; shift 2;;
    --out) OUT="$2"; shift 2;;
    *) echo "Argumento desconocido: $1"; exit 1;;
  esac
done

# --- Validaciones ---
[[ -n "$APK" && -f "$APK" ]] || { echo "ERROR: --apk no existe"; exit 1; }
[[ -n "$PKG" ]] || { echo "ERROR: falta --pkg"; exit 1; }
[[ "$PKG" =~ ^[a-z][a-z0-9]*(\.[a-z0-9]+)+$ ]] || { echo "ERROR: package inválido: $PKG"; exit 1; }
[[ -n "$NAME" ]] || { echo "ERROR: falta --name"; exit 1; }
[[ -n "$ICON" && -f "$ICON" ]] || { echo "ERROR: --icon no existe"; exit 1; }
[[ -n "$TOKEN" ]] || { echo "ERROR: falta --token"; exit 1; }
[[ -n "$OUT" ]] || { echo "ERROR: falta --out"; exit 1; }
[[ -n "${APK_TOKEN_KEY:-}" ]] || { echo "ERROR: falta APK_TOKEN_KEY (clave maestra)"; exit 1; }
[[ -f "$KEYSTORE" ]] || { echo "ERROR: keystore no existe: $KEYSTORE"; exit 1; }
command -v java >/dev/null || { echo "ERROR: no hay java"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
APKSIGNER="$SDK_BUILD_TOOLS/apksigner"
ZIPALIGN="$SDK_BUILD_TOOLS/zipalign"

echo "==> Descomprimiendo con apktool..."
java -jar "$APKTOOL_JAR" d -f -o "$WORK/app" "$APK" >/dev/null

echo "==> Parcheando manifest (package + label)..."
MANIFEST="$WORK/app/AndroidManifest.xml"
[[ -f "$MANIFEST" ]] || { echo "ERROR: no se encontró AndroidManifest.xml"; exit 1; }

# Cambiar el package en el manifest
sed -i "s/package=\"com\.mxtunnel\.app\"/package=\"$PKG\"/" "$MANIFEST"

# Label: si el manifest usa @string/app_name, se edita strings.xml
if grep -q 'android:label="@string/app_name"' "$MANIFEST"; then
  STRINGS="$WORK/app/res/values/strings.xml"
  [[ -f "$STRINGS" ]] || { echo "ERROR: no está res/values/strings.xml"; exit 1; }
  # Escapar & < > para XML
  ESC_NAME=$(printf '%s' "$NAME" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')
  sed -i "s|<string name=\"app_name\">[^<]*</string>|<string name=\"app_name\">$ESC_NAME</string>|" "$STRINGS"
else
  sed -i "s|android:label=\"[^\"]*\"|android:label=\"$NAME\"|" "$MANIFEST"
fi

echo "==> Reemplazando icono..."
# El icono de la base está renombrado por shrinkResources (res/oW.jpg).
# Buscamos el drawable que el manifest referencia como icono y lo sustituimos.
ICON_REF=$(grep -oE 'android:icon="@[^"]*"' "$MANIFEST" | head -1 | sed 's/android:icon="@//; s/"//')
if [[ -n "$ICON_REF" ]]; then
  # @drawable/xxx → res/xxx.ext  (apktool descomprime resources con el nombre original)
  ICON_NAME="${ICON_REF#drawable/}"
  # Buscar el archivo real (extensión variable, en res/**)
  ICON_TARGET=$(find "$WORK/app/res" -iname "${ICON_NAME}.*" | head -1)
  if [[ -z "$ICON_TARGET" ]]; then
    # fallback: si no está, usar el primer jpg/png de res/ (el icono de la base)
    ICON_TARGET=$(find "$WORK/app/res" \( -iname '*.jpg' -o -iname '*.png' \) | head -1)
  fi
  [[ -n "$ICON_TARGET" ]] || { echo "ERROR: no se pudo localizar el icono en res/"; exit 1; }
  cp "$ICON" "$ICON_TARGET"
  echo "    icono -> $ICON_TARGET"
else
  echo "WARN: no se encontró android:icon en el manifest"
fi

echo "==> Escribiendo token cifrado en assets/token.enc..."
TOKEN_ENC="$("$BASE_DIR/token_encrypt.py" "$TOKEN")"
mkdir -p "$WORK/app/assets"
printf '%s' "$TOKEN_ENC" > "$WORK/app/assets/token.enc"

echo "==> Re-empaquetando con apktool..."
# Borrar cualquier firma residual de la base (evita v1 inconsistente) ANTES de empaquetar
rm -rf "$WORK/app/META-INF"
java -jar "$APKTOOL_JAR" b -o "$WORK/unsigned.apk" "$WORK/app" >/dev/null

echo "==> Alineando (zipalign) ANTES de firmar..."
"$ZIPALIGN" -f 4 "$WORK/unsigned.apk" "$WORK/aligned.apk"

echo "==> Firmando con $KEYSTORE (v1+v2+v3)..."
"$APKSIGNER" sign --ks "$KEYSTORE" --ks-pass "pass:$KS_PASS" --ks-key-alias "$KS_ALIAS" \
  --key-pass "pass:$KS_PASS" \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --out "$OUT" "$WORK/aligned.apk"

echo "==> OK: $OUT"
ls -lh "$OUT"
