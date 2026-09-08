#!/usr/bin/env bash
# ============================================================
# repack_apk.sh — Re-empaqueta la APK base release de VpnApp con:
#   package, nombre (label), icono y token+pkey cifrados por usuario.
#
# Uso:
#   APK_TOKEN_KEY="<clave>" APP_CRYPTO_KEY="<master>" APP_WRAP_KEY="<wrap>" \
#       ./repack_apk.sh \
#       --apk   /ruta/vpnapp-release-unsigned.apk \
#       --pkg   com.vpnapp.usuario \
#       --name  "VpnApp" \
#       --icon  /ruta/icono.png \
#       --token 1a911475-5a83-4119-909d-e8010b75d6e3 \
#       --out   /ruta/salida.apk
#
# La APK base debe ser la release de VpnApp (package com.vpnapp):
#   VpnApp/app/build/outputs/apk/release/app-release-unsigned.apk
#
# Assets por usuario:
#   - assets/token.enc  = token cifrado con APK_TOKEN_KEY (identidad).
#   - assets/pkey.enc   = authKey+encKey derivados del master APP_CRYPTO_KEY
#     y envueltos con APP_WRAP_KEY (lo desenvuelve el .so nativo vpnsec).
#
# Requisitos: apktool (APKTOOL_JAR o en PATH), apksigner, zipalign,
#             keystore vpnapp_debug.jks, python3 + 'cryptography'.
# ============================================================
set -euo pipefail

# --- Configuración (variables de entorno, con fallbacks) ---
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYSTORE="${APK_KEYSTORE:-$BASE_DIR/../app/vpnapp_debug.jks}"
KS_PASS="${APK_KS_PASS:-vpnapp}"
KS_ALIAS="${APK_KS_ALIAS:-vpnapp}"
APKTOOL_JAR="${APKTOOL_JAR:-$HOME/.local/share/apktool/apktool.jar}"
SDK_BUILD_TOOLS="${SDK_BUILD_TOOLS:-$HOME/Android/Sdk/build-tools/37.0.0}"

# Package de la base VpnApp (para localizar y validar el manifest)
BASE_PKG="com.vpnapp"

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
[[ -n "$ICON" && -f "$ICON" ]] || { echo "ERROR: falta --icon (obligatorio)"; exit 1; }
[[ -n "$TOKEN" ]] || { echo "ERROR: falta --token"; exit 1; }
[[ -n "$OUT" ]] || { echo "ERROR: falta --out"; exit 1; }
[[ -n "${APK_TOKEN_KEY:-}" ]] || { echo "ERROR: falta APK_TOKEN_KEY"; exit 1; }
[[ -n "${APP_CRYPTO_KEY:-}" ]] || { echo "ERROR: falta APP_CRYPTO_KEY (master)"; exit 1; }
[[ -n "${APP_WRAP_KEY:-}" ]] || { echo "ERROR: falta APP_WRAP_KEY (wrap pkey)"; exit 1; }
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

# Validar que la base es VpnApp
if ! grep -q "package=\"$BASE_PKG\"" "$MANIFEST"; then
  echo "ERROR: la base no tiene package=\"$BASE_PKG\". ¿Es la APK release de VpnApp? (APK_BASE)"
  exit 1
fi

# Cambiar el package en el manifest (solo el atributo raíz; los nombres de clase
# com.vpnapp.* se dejan intactos porque viven en el dex)
sed -i "s/package=\"$BASE_PKG\"/package=\"$PKG\"/" "$MANIFEST"

# Permiso automático de androidx (receivers dinámicos, Android 13+): el prefijo
# debe coincidir con el package nuevo. Dos ocurrencias (<permission> y <uses-permission>).
sed -i "s/${BASE_PKG}\.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION/${PKG}.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION/g" "$MANIFEST"

# Label: si el manifest usa @string/app_name, se edita app_name en TODOS los
# locales (values, values-es, ...).
if grep -q 'android:label="@string/app_name"' "$MANIFEST"; then
  ESC_NAME=$(printf '%s' "$NAME" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')
  FOUND=0
  for STRINGS in "$WORK"/app/res/values*/strings.xml; do
    if [[ -f "$STRINGS" ]]; then
      sed -i "s|<string name=\"app_name\">[^<]*</string>|<string name=\"app_name\">$ESC_NAME</string>|" "$STRINGS"
      FOUND=1
    fi
  done
  if [[ "$FOUND" -eq 0 ]]; then
    echo "ERROR: no se encontró res/values*/strings.xml"
    exit 1
  fi
else
  sed -i "s|android:label=\"[^\"]*\"|android:label=\"$NAME\"|" "$MANIFEST"
fi

echo "==> Reemplazando icono (PNG cuadrado)..."
# El launcher de VpnApp es ADAPTATIVO (mipmap-anydpi-v26/*.xml). Para un icono
# cuadrado estilo MXTunnel: eliminamos las variantes adaptativas (API 26+ las
# preferiría sobre cualquier densidad) y escribimos el PNG del usuario en
# res/mipmap-xxhdpi/. Tanto ic_launcher como ic_launcher_round usan el mismo PNG
# (el manifest sigue referenciando @mipmap/ic_launcher_round).
ICON_REF=$(grep -oE 'android:icon="@[^"]*"' "$MANIFEST" | head -1 | sed 's/android:icon="@//; s/"//')
if [[ -z "$ICON_REF" ]]; then
  echo "ERROR: no se encontró android:icon en el manifest"
  exit 1
fi
ICON_NAME="${ICON_REF#*/}"   # @mipmap/ic_launcher | @drawable/foo -> nombre
# Borrar variantes adaptativas que compartan ese nombre (+ round)
find "$WORK/app/res" -type d -name "mipmap-anydpi*" -print0 2>/dev/null | while IFS= read -r -d '' D; do
  rm -f "$D/$ICON_NAME.xml" "$D/${ICON_NAME}_round.xml" 2>/dev/null
done
# Quitar posibles png/xml viejos del mismo nombre en otras densidades
find "$WORK/app/res" -path "*/mipmap-*" -iname "${ICON_NAME}.*" -delete 2>/dev/null || true
ICON_DIR="$WORK/app/res/mipmap-xxhdpi"
mkdir -p "$ICON_DIR"
cp "$ICON" "$ICON_DIR/$ICON_NAME.png"
# Mantener vivo el recurso round que el manifest referencia
cp "$ICON" "$ICON_DIR/${ICON_NAME}_round.png"
echo "    icono -> $ICON_DIR/$ICON_NAME.png (+ round)"

echo "==> Escribiendo assets/token.enc y assets/pkey.enc..."
TOKEN_ENC="$("$BASE_DIR/token_encrypt.py" "$TOKEN")"
PKEY_ENC="$("$BASE_DIR/pkey_encrypt.py" "$TOKEN")"
mkdir -p "$WORK/app/assets"
printf '%s' "$TOKEN_ENC" > "$WORK/app/assets/token.enc"
printf '%s' "$PKEY_ENC" > "$WORK/app/assets/pkey.enc"

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
