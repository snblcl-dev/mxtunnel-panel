#!/usr/bin/env python3
"""Cifra un token del panel con AES-GCM (mismo esquema que TokenCipher.java).

Uso: token_encrypt.py <token>   (lee APK_TOKEN_KEY de entorno o .env)
Salida: Base64(iv + ciphertext + tag)
"""
import base64
import hashlib
import os
import sys

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives import hashes
except ImportError:
    sys.stderr.write("Falta 'cryptography'. Instala: pip install cryptography\n")
    sys.exit(2)

SALT = bytes([0x4d, 0x58, 0x54, 0x75, 0x6e, 0x6e, 0x65, 0x6c,
              0x21, 0x40, 0x23, 0x24, 0x25, 0x5e, 0x26, 0x2a])
ITERATIONS = 12000
KEY_BITS = 32  # 256 bits


def master_key() -> bytes:
    env = os.environ.get("APK_TOKEN_KEY", "").strip()
    if not env:
        # fallback: leer .env local (clave APK_TOKEN_KEY=...)
        env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
        if os.path.exists(env_path):
            for line in open(env_path):
                line = line.strip()
                if line.startswith("APK_TOKEN_KEY="):
                    env = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    if not env:
        sys.stderr.write("No hay APK_TOKEN_KEY (variable de entorno o .env)\n")
        sys.exit(3)
    return base64.b64decode(env)


def encrypt(token: str) -> str:
    master = master_key()
    master_hex = master.hex().encode()
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=KEY_BITS, salt=SALT, iterations=ITERATIONS)
    key = kdf.derive(master_hex)
    iv = os.urandom(12)
    ct = AESGCM(key).encrypt(iv, token.encode(), None)
    return base64.b64encode(iv + ct).decode()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.stderr.write("Uso: token_encrypt.py <token>\n")
        sys.exit(1)
    print(encrypt(sys.argv[1]))
