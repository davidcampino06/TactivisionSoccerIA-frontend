import { ApiError, api } from "../api/client";

// Passwords are encrypted in the browser with the backend's RSA public key (RSA-OAEP, SHA-256)
// before being sent, so DevTools -> Network never shows them in plain text.
export const ENCRYPTED_PREFIX = "rsa:";

type PublicKeyResponse = { algorithm: string; key: string };

let keyPromise: Promise<CryptoKey> | null = null;

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function bytesToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function loadPublicKey(): Promise<CryptoKey> {
  keyPromise ??= api<PublicKeyResponse>("/api/auth/public-key")
    .then(({ key }) =>
      crypto.subtle.importKey("spki", base64ToBytes(key), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]),
    )
    .catch((error: unknown) => {
      keyPromise = null; // retry on the next attempt
      throw error;
    });
  return keyPromise;
}

/** Returns "rsa:<base64>" ready to send in place of the plain password. */
export async function encryptPassword(password: string): Promise<string> {
  const key = await loadPublicKey();
  const ciphertext = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, new TextEncoder().encode(password));
  return ENCRYPTED_PREFIX + bytesToBase64(ciphertext);
}

/** The backend may restart with a new key; call this and retry once if decryption fails. */
export function forgetPublicKey(): void {
  keyPromise = null;
}

/**
 * Sends a request with one or more passwords encrypted. If the backend restarted with a new key
 * (PASSWORD_DECRYPTION_FAILED), the key is fetched again and the request is retried once.
 */
export async function withEncryptedPasswords<T>(passwords: string[], request: (encrypted: string[]) => Promise<T>): Promise<T> {
  const encryptAll = () => Promise.all(passwords.map(encryptPassword));
  try {
    return await request(await encryptAll());
  } catch (error) {
    if (error instanceof ApiError && error.code === "PASSWORD_DECRYPTION_FAILED") {
      forgetPublicKey();
      return request(await encryptAll());
    }
    throw error;
  }
}
