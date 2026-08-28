import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFileAsync = promisify(execFile);

// Regex estricto para el package de Android: a.b.c (solo minúsculas, dígitos, puntos)
export const PKG_REGEX = /^[a-z][a-z0-9]*(\.[a-z0-9]+)+$/;

// Tiempo de vida de los APKs generados (ms)
export const APK_TTL_MS = 3 * 60 * 60 * 1000; // 3 horas

export interface ApkBuildInput {
  userId: string;
  package: string;
  name: string;
  iconBase64?: string; // dataURL (data:image/png;base64,...) o base64 puro
  token: string; // UUID del usuario
}

export interface ApkBuildResult {
  file: string; // nombre del archivo (para descarga)
  path: string; // ruta absoluta
  size: number;
}

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta ${name} en el entorno (.env)`);
  return v;
}

function baseApkPath(): string {
  return process.env.APK_BASE || path.resolve(process.cwd(), 'secrets', 'app-release-unsigned.apk');
}

function outputDir(): string {
  return process.env.APK_OUTPUT_DIR || path.resolve(process.cwd(), 'uploads', 'apk');
}

function toolsDir(): string {
  return path.resolve(process.cwd(), 'tools');
}

/** Guarda el icono (base64) en uploads/apk/ y devuelve la ruta. */
function saveIcon(userId: string, iconBase64: string): string {
  // Quitar el prefijo dataURL si viene
  const m = /^data:image\/[a-zA-Z+]+;base64,(.+)$/.exec(iconBase64.trim());
  const b64 = m ? m[1] : iconBase64.trim();
  const buf = Buffer.from(b64, 'base64');
  if (buf.length === 0 || buf.length > 5 * 1024 * 1024) {
    throw new Error('Icono inválido (vacío o >5MB).');
  }
  // El drawable de la base es ico.png: apktool exige que el archivo sea PNG.
  // El frontend convierte a PNG vía canvas; aquí validamos la firma real.
  const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) {
    throw new Error('El icono debe ser PNG (usa una imagen PNG o JPG; se convertirá a PNG).');
  }
  const dir = outputDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `icon_${userId}.png`);
  fs.writeFileSync(file, buf);
  return file;
}

/** Borra los APKs con más de APK_TTL_MS de antigüedad en el directorio de salida. */
export function cleanOldApks(): void {
  try {
    const dir = outputDir();
    if (!fs.existsSync(dir)) return;
    const now = Date.now();
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.apk')) continue;
      const full = path.join(dir, f);
      try {
        const st = fs.statSync(full);
        if (now - st.mtimeMs > APK_TTL_MS) {
          fs.unlinkSync(full);
          console.log(`[apk-builder] Limpieza: borrado ${f}`);
        }
      } catch {
        // archivo desapareció o no se puede leer; ignorar
      }
    }
  } catch (err) {
    console.error('[apk-builder] Error en limpieza de APKs:', err);
  }
}

/**
 * Genera la APK personalizada para un usuario.
 * 1. Valida package/nombre.
 * 2. Guarda el icono.
 * 3. Cifra el token.
 * 4. Llama a tools/repack_apk.sh.
 * 5. Limpia APKs viejos.
 */
export async function buildApk(input: ApkBuildInput): Promise<ApkBuildResult> {
  const pkg = input.package.trim();
  const name = input.name.trim();

  if (!PKG_REGEX.test(pkg)) {
    throw new Error('Package inválido. Usa formato com.ejemplo.app (minúsculas y puntos).');
  }
  if (name.length < 1 || name.length > 40) {
    throw new Error('Nombre inválido (1-40 caracteres).');
  }
  if (pkg === 'com.mxtunnel.app') {
    throw new Error('Ese package está reservado. Elige otro.');
  }

  // Limpiar APKs viejos antes de generar
  cleanOldApks();

  const base = baseApkPath();
  if (!fs.existsSync(base)) throw new Error('APK base no encontrada (configura APK_BASE).');

  const iconPath = input.iconBase64 ? saveIcon(input.userId, input.iconBase64) : undefined;
  // El token va EN CLARO al script: repack_apk.sh ya lo cifra con token_encrypt.py
  // (la app descifra una vez con TokenCipher). Pasarlo cifrado aquí doblaría el cifrado.
  const tokenEnc = input.token;

  const dir = outputDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = `MXTunnel_${pkg.replace(/\./g, '_')}.apk`;
  const out = path.join(dir, file);

  const script = path.join(toolsDir(), 'repack_apk.sh');
  const args = [
    '--apk', base,
    '--pkg', pkg,
    '--name', name,
    '--token', tokenEnc,
    '--out', out,
  ];
  if (iconPath) {
    args.push('--icon', iconPath);
  }

  const { stdout } = await execFileAsync('bash', [script, ...args], {
    env: {
      ...process.env,
      APK_TOKEN_KEY: envOrThrow('APK_TOKEN_KEY'),
      APK_KEYSTORE: process.env.APK_KEYSTORE || '',
      APK_KS_PASS: process.env.APK_KS_PASS || '',
      APK_KS_ALIAS: process.env.APK_KS_ALIAS || '',
      APKTOOL_JAR: process.env.APKTOOL_JAR || '',
      SDK_BUILD_TOOLS: process.env.SDK_BUILD_TOOLS || '',
    },
    timeout: 300000, // 5 min
    maxBuffer: 1024 * 1024,
  });

  if (!fs.existsSync(out)) {
    throw new Error(`El script no generó el APK: ${stdout.slice(-500)}`);
  }

  return { file, path: out, size: fs.statSync(out).size };
}
