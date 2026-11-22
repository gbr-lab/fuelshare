// Sicurezza account: hashing password, politica password, token di sessione.
// Riferimenti: OWASP Password Storage / Authentication / Session Management Cheat Sheet, ASVS (cap. Autenticazione e Sessioni).
import * as Crypto from 'expo-crypto';
import { scryptAsync } from '@noble/hashes/scrypt';

// ---------------------------------------------------------------------------
// PARAMETRI (modificabili qui)
// ---------------------------------------------------------------------------
export const MIN_PASSWORD_LENGTH = 12;   // senza 2° fattore meglio una password lunga
export const MAX_PASSWORD_LENGTH = 128;  // limite alto: solo per evitare abusi di CPU
// scrypt: N = costo CPU/memoria (2^15 = 32 MiB), r = dimensione blocco, p = parallelismo.
// I valori sono salvati dentro ogni hash: in futuro puoi alzarli e gli hash vecchi
// vengono aggiornati automaticamente al primo login corretto.
export const SCRYPT = { N: 2 ** 15, r: 8, p: 1, dkLen: 32 };

export const SESSION_IDLE_MS = 14 * 24 * 3600 * 1000;      // scade dopo 14 giorni di inattività
export const SESSION_ABSOLUTE_MS = 90 * 24 * 3600 * 1000;  // e comunque dopo 90 giorni

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
const HEX = '0123456789abcdef';
export function bytesToHex(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += HEX[bytes[i] >> 4] + HEX[bytes[i] & 15];
  return s;
}
export function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
function utf8Bytes(str) {
  const out = [];
  for (const ch of str) {
    const c = ch.codePointAt(0);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return new Uint8Array(out);
}
// Confronto a tempo costante (evita di rivelare "quanti caratteri coincidono")
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
// Normalizzazione Unicode (NFKC) come raccomandato da OWASP/ASVS, senza troncare nulla
function prepare(password) {
  try { return utf8Bytes(password.normalize('NFKC')); } catch { return utf8Bytes(password); }
}

export const sha256Hex = (s) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, s);

// ---------------------------------------------------------------------------
// Hash password: scrypt + salt casuale per utente. Formato: scrypt$N$r$p$salt$hash
// ---------------------------------------------------------------------------
export async function hashPassword(password) {
  const salt = Crypto.getRandomBytes(16);
  const { N, r, p, dkLen } = SCRYPT;
  const dk = await scryptAsync(prepare(password), salt, { N, r, p, dkLen, asyncTick: 10 });
  return `scrypt$${N}$${r}$${p}$${bytesToHex(salt)}$${bytesToHex(dk)}`;
}

export function isLegacyHash(stored) { return !stored.startsWith('scrypt$'); }

export function needsRehash(stored) {
  if (isLegacyHash(stored)) return true;
  const [, N, r, p] = stored.split('$');
  return Number(N) < SCRYPT.N || Number(r) < SCRYPT.r || Number(p) < SCRYPT.p;
}

export async function verifyPassword(password, stored) {
  if (isLegacyHash(stored)) {
    // Hash della Fase 1-3 (SHA-256 senza salt): accettato solo per migrare l'account
    return safeEqual(await sha256Hex(password), stored);
  }
  const [, N, r, p, saltHex, hashHex] = stored.split('$');
  const dk = await scryptAsync(prepare(password), hexToBytes(saltHex), {
    N: Number(N), r: Number(r), p: Number(p), dkLen: hashHex.length / 2, asyncTick: 10,
  });
  return safeEqual(bytesToHex(dk), hashHex);
}

// Hash "finto" per confrontare sempre lo stesso tempo anche se l'email non esiste
let dummy = null;
export async function dummyVerify(password) {
  if (!dummy) dummy = await hashPassword('timing-equalizer-not-a-real-password');
  await verifyPassword(password, dummy);
}

// ---------------------------------------------------------------------------
// Token di sessione: 256 bit casuali. Nel telefono (SecureStore) c'è il token,
// nel database solo il suo SHA-256: leggere il DB non basta per rubare la sessione.
// ---------------------------------------------------------------------------
export function newSessionToken() { return bytesToHex(Crypto.getRandomBytes(32)); }

// Codice casuale crittograficamente sicuro (usato per i codici di condivisione)
export function secureRandomCode(alphabet, length) {
  let out = '';
  while (out.length < length) {
    const b = Crypto.getRandomBytes(1)[0];
    if (b >= 256 - (256 % alphabet.length)) continue; // scarta per evitare distorsioni
    out += alphabet[b % alphabet.length];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Validazione email / nome / password
// ---------------------------------------------------------------------------
export function normalizeEmail(email) { return String(email || '').trim().toLowerCase(); }

export function validateEmail(email) {
  const e = normalizeEmail(email);
  if (e.length < 5 || e.length > 254) return 'Email non valida.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return 'Email non valida.';
  return null;
}

export function validateName(name) {
  const n = String(name || '').trim();
  if (n.length < 1) return 'Inserisci il tuo nome.';
  if (n.length > 60) return 'Il nome può avere al massimo 60 caratteri.';
  return null;
}

// Password molto comuni (con 12+ caratteri). Il controllo online completo (database di
// password violate, es. Have I Been Pwned) richiede internet: lo aggiungeremo con il cloud in Fase 4.
const COMMON = [
  'passwordpassword', 'password1234', 'password12345', 'password123456', 'passw0rd1234',
  '123456789012', '1234567890123', '12345678901234', '111111111111', '000000000000',
  'qwertyuiop12', 'qwertyuiopas', 'qwertyuiop123', 'qwerty123456', 'asdfghjkl123',
  'iloveyou1234', 'letmein12345', 'welcome12345', 'administrator', 'abcdefghijkl',
  'abcd12345678', 'changeme1234', 'correcthorsebatterystaple', 'ciaociaociao',
  'ciao12345678', 'forzaitalia12', 'italia123456', 'juventus1897', 'milaninter12',
  'fuelshare1234', 'fuelshare12345',
];

export function validatePassword(password, { email = '', name = '' } = {}) {
  if (typeof password !== 'string') return 'Password non valida.';
  if (password.length < MIN_PASSWORD_LENGTH) return `La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri (meglio una frase lunga che una parola complicata).`;
  if (password.length > MAX_PASSWORD_LENGTH) return `La password può avere al massimo ${MAX_PASSWORD_LENGTH} caratteri.`;
  const low = password.toLowerCase();
  if (COMMON.includes(low)) return 'Questa password è troppo comune: scegline un\'altra.';
  if (new Set(low).size < 5) return 'Password troppo ripetitiva.';
  const local = normalizeEmail(email).split('@')[0];
  if (local.length >= 4 && low.includes(local)) return 'La password non deve contenere la tua email.';
  const n = String(name).trim().toLowerCase();
  if (n.length >= 4 && low.includes(n)) return 'La password non deve contenere il tuo nome.';
  return null;
}

// Indicatore visivo (non sostituisce le regole sopra): 0 = debole … 4 = ottima
export function passwordStrength(password) {
  if (!password) return { score: 0, label: '' };
  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score++;
  if (password.length >= 16) score++;
  if (password.length >= 20) score++;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (classes >= 3) score++;
  if (validatePassword(password)) score = Math.min(score, 1);
  const labels = ['Debole', 'Debole', 'Discreta', 'Buona', 'Ottima'];
  return { score: Math.min(score, 4), label: labels[Math.min(score, 4)] };
}

// ---------------------------------------------------------------------------
// Blocco temporaneo dopo troppi tentativi falliti (rallenta gli attacchi a forza bruta)
// Dal 5° errore: 30 s, poi raddoppia a ogni errore, fino a 15 minuti.
// ---------------------------------------------------------------------------
export function lockDurationMs(failedAttempts) {
  if (failedAttempts < 5) return 0;
  return Math.min(15 * 60 * 1000, 30 * 1000 * 2 ** (failedAttempts - 5));
}

// ---------------------------------------------------------------------------
// Codice di recupero password (funziona anche offline, senza server né email).
// 20 caratteri casuali (~100 bit) mostrati UNA volta sola, nel database ne resta solo l'hash.
// Essendo già casuale e molto lungo, basta SHA-256 (come un token); è usabile una volta e
// viene rigenerato a ogni recupero. Gli errori contano nel blocco anti-brute-force.
// ---------------------------------------------------------------------------
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const RECOVERY_LENGTH = 20;

export function generateRecoveryCode() {
  const raw = secureRandomCode(RECOVERY_ALPHABET, RECOVERY_LENGTH);
  return raw.match(/.{4}/g).join('-'); // XXXX-XXXX-XXXX-XXXX-XXXX
}
export function normalizeRecoveryCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
export async function hashRecoveryCode(code) {
  return sha256Hex('fuelshare-recovery:' + normalizeRecoveryCode(code));
}
export async function verifyRecoveryCode(code, storedHash) {
  const norm = normalizeRecoveryCode(code);
  const h = await sha256Hex('fuelshare-recovery:' + norm);
  return !!storedHash && norm.length === RECOVERY_LENGTH && safeEqual(h, storedHash);
}
