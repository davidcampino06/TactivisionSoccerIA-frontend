import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "../api/client";
import { ENCRYPTED_PREFIX, encryptPassword, forgetPublicKey, withEncryptedPasswords } from "./crypto";

vi.mock("../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client")>()),
  api: vi.fn(),
}));

const apiMock = vi.mocked(api);
let keys: CryptoKeyPair;
let publicKey: string;

const toBase64 = (buffer: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

/** Plays the backend's part: decrypts "rsa:<base64>" with the private key. */
async function decrypt(value: string, privateKey = keys.privateKey): Promise<string> {
  expect(value.startsWith(ENCRYPTED_PREFIX)).toBe(true);
  const bytes = fromBase64(value.slice(ENCRYPTED_PREFIX.length));
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, bytes));
}

async function newKeyPair() {
  const pair = await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true, ["encrypt", "decrypt"]);
  return { pair, spki: toBase64(await crypto.subtle.exportKey("spki", pair.publicKey)) };
}

beforeAll(async () => {
  const generated = await newKeyPair();
  keys = generated.pair;
  publicKey = generated.spki;
});

beforeEach(() => {
  forgetPublicKey();
  apiMock.mockReset();
  apiMock.mockImplementation(async (path: string) => {
    if (path === "/api/auth/public-key") return { algorithm: "RSA-OAEP-SHA256", key: publicKey };
    throw new Error(`unexpected request ${path}`);
  });
});

describe("password encryption (RSA-OAEP, SHA-256)", () => {
  it("only the backend's private key can read the password", async () => {
    const encrypted = await encryptPassword("Pizarra#2026");
    expect(encrypted).not.toContain("Pizarra");
    expect(await decrypt(encrypted)).toBe("Pizarra#2026");

    const other = await newKeyPair();
    await expect(decrypt(encrypted, other.pair.privateKey)).rejects.toThrow();
  });

  it("the same password gives a different ciphertext every time (random padding)", async () => {
    const [first, second] = [await encryptPassword("Pizarra#2026"), await encryptPassword("Pizarra#2026")];
    expect(first).not.toBe(second);
    expect(await decrypt(first)).toBe(await decrypt(second));
  });

  it("keeps Spanish characters intact (UTF-8)", async () => {
    expect(await decrypt(await encryptPassword("Ñandú#Año2026"))).toBe("Ñandú#Año2026");
  });

  it("asks the backend for the public key only once", async () => {
    await encryptPassword("Uno#12345");
    await encryptPassword("Dos#12345");
    expect(apiMock).toHaveBeenCalledTimes(1);
  });

  it("if the key request fails, the next attempt asks again", async () => {
    apiMock.mockRejectedValueOnce(new ApiError(503, "down"));
    await expect(encryptPassword("Pizarra#2026")).rejects.toThrow("down");
    expect(await decrypt(await encryptPassword("Pizarra#2026"))).toBe("Pizarra#2026");
    expect(apiMock).toHaveBeenCalledTimes(2);
  });

  it("retries once with a fresh key when the server says it cannot decrypt", async () => {
    const seen: string[][] = [];
    const request = vi.fn(async (encrypted: string[]) => {
      seen.push(encrypted);
      if (seen.length === 1) throw new ApiError(400, "bad", "PASSWORD_DECRYPTION_FAILED");
      return Promise.all(encrypted.map((value) => decrypt(value)));
    });
    await expect(withEncryptedPasswords(["Actual#2026", "Nueva#2026x"], request)).resolves.toEqual(["Actual#2026", "Nueva#2026x"]);
    expect(request).toHaveBeenCalledTimes(2);
    expect(apiMock).toHaveBeenCalledTimes(2); // the key was fetched again
  });

  it("other errors are not retried", async () => {
    const request = vi.fn().mockRejectedValue(new ApiError(401, "no", "INVALID_CREDENTIALS"));
    await expect(withEncryptedPasswords(["Pizarra#2026"], request)).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
