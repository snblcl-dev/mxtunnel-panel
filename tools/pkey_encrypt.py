#!/usr/bin/env python3
"""Genera assets/pkey.enc de un clon: envuelve authKey+encKey del usuario.

authKey/encKey se derivan del master APP_CRYPTO_KEY (solo server) por usuario:
    authKey = HMAC(APP_CRYPTO_KEY, "vpnapp:auth:<userId>")
    encKey  = HMAC(APP_CRYPTO_KEY, "vpnapp:enc:<userId>")
El nativo desenvuelve con la clave WRAP embebida (APP_WRAP_KEY).

Uso: pkey_encrypt.py <userId>   (lee APP_CRYPTO_KEY y APP_WRAP_KEY de entorno/.env)
Salida: Base64(iv[12] + ct[64] + tag[16])
"""
import base64
import hmac
import hashlib
import os
import sys

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:
    sys.stderr.write("Falta 'cryptography'. Instala: pip install cryptography\n")
    sys.exit(2)

_LABEL_AUTH = "vpnapp:auth:"
_LABEL_ENC = "vpnapp:enc:"


def _env(key: str) -> bytes:
    v = os.environ.get(key, "").strip()
    if not v:
        here = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
        if os.path.exists(here):
            for line in open(here):
                line = line.strip()
                if line.startswith(key + "="):
                    v = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    if not v:
        sys.stderr.write(f"No hay {key} (variable de entorno o .env)\n")
        sys.exit(3)
    return base64.b64decode(v)


def _hmac(key: bytes, label: str, uid: str) -> bytes:
    return hmac.new(key, (label + uid).encode(), hashlib.sha256).digest()


def build(user_id: str, master: bytes, wrap: bytes) -> str:
    auth = _hmac(master, _LABEL_AUTH, user_id)
    enc = _hmac(master, _LABEL_ENC, user_id)
    payload = auth + enc  # 64 bytes
    iv = os.urandom(12)
    ct = AESGCM(wrap).encrypt(iv, payload, None)
    return base64.b64encode(iv + ct).decode()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.stderr.write("Uso: pkey_encrypt.py <userId>\n")
        sys.exit(1)
    master = _env("APP_CRYPTO_KEY")
    wrap = _env("APP_WRAP_KEY")
    print(build(sys.argv[1], master, wrap))
