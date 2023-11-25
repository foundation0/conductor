// @file = index.ts

import z from "zod"
import b4a from "b4a"
import { ethers } from "ethers"
import { blake3 } from "@noble/hashes/blake3"
import { scrypt } from "@noble/hashes/scrypt"
import { sha3_256 } from "@noble/hashes/sha3"
import { getPublicKey, verify, signAsync } from "@noble/secp256k1"
import { pack, unpack } from "msgpackr"
import { KeyPairS, SecurePasswordS, VerifyPasswordS, EncryptS, DecryptS } from "@/data/schemas/security"
import { error } from "@/libraries/logging"
import sodium from "sodium-javascript"

type Hex = Uint8Array | string
;(async () => {
  if (typeof sodium["init"] === "function") await sodium.init()
})()

export function buf2hex({ input, add0x = false }: { input: Uint8Array | Buffer; add0x?: boolean }): string {
  const str = b4a.toString(input, "hex")
  if (!add0x) return str
  return "0x" + str
}

export function hex2buf({ input }: { input: string }): Uint8Array {
  return b4a.from(input.replace(/^0x/, ""), "hex")
}

export function hmac({ data, key }: { data: Uint8Array; key: Uint8Array }): Uint8Array {
  return hex2buf({ input: ethers.computeHmac("sha256", key, data) })
}

export function getId(): string {
  return buf2hex({ input: keyPair().public_key, add0x: true })
}

export function keyPair({ seed }: { seed?: Uint8Array } = {}): z.infer<typeof KeyPairS> {
  if (!seed) {
    seed = b4a.alloc(64)
    sodium.randombytes_buf(seed)
  } else seed = b4a.from(seed)
  const id = ethers.HDNodeWallet.fromSeed(seed)
  return {
    public_key: hex2buf({ input: id.publicKey }),
    secret_key: hex2buf({ input: id.privateKey }),
  }
}

export function securePassword({ password, salt }: z.infer<typeof SecurePasswordS>): Uint8Array {
  return scrypt(password, salt, { N: 2 ** 16, r: 8, p: 1, dkLen: 32 })
}

export function verifyPassword({ hash, password, salt }: z.infer<typeof VerifyPasswordS>): boolean {
  const hashi = securePassword({ password, salt })
  return b4a.equals(hashi, hash)
}

export function encrypt({ data, key }: z.infer<typeof EncryptS>): { cipher: Uint8Array; nonce: string } {
  const d = pack(data)
  const h = createHash({ str: key })
  const secret = h.slice(0, 32)
  const nonce = b4a.alloc(sodium.crypto_secretbox_NONCEBYTES)

  sodium.randombytes_buf(nonce)

  const cipher = b4a.alloc(d.length + sodium.crypto_secretbox_MACBYTES)

  sodium.crypto_secretbox_easy(cipher, d, nonce, secret)
  return { cipher, nonce: buf2hex({ input: nonce }) }
}

export function decrypt({ key, cipher, nonce }: z.infer<typeof DecryptS>): any {
  try {
    const decrypted_data = b4a.alloc(cipher.length - sodium.crypto_secretbox_MACBYTES)
    const secret = createHash({ str: key }).slice(0, 32)
    sodium.crypto_secretbox_open_easy(decrypted_data, cipher, b4a.from(nonce, "hex"), secret)
    const unpacked = unpack(decrypted_data)
    return unpacked
  } catch (err: any) {
    error({ message: err.message, data: err })
    return false
  }
}

export function createHash({ str }: { str: Uint8Array | string }): Uint8Array {
  return blake3(b4a.isBuffer(str) ? str : b4a.from(str))
}

export function validateKeyPair(keyPair: z.infer<typeof KeyPairS>): boolean {
  const public_key = getPublicKey(keyPair.secret_key, true)
  const pub = keyPair.public_key
  return buf2hex({ input: pub }) === buf2hex({ input: public_key })
}

export async function signMessage(message: Uint8Array | string, secretKey: Uint8Array): Promise<Uint8Array> {
  const m = b4a.isBuffer(message) ? b4a.from(message) : message
  const s = await signAsync(buf2hex({ input: createHash({ str: m }) }), buf2hex({ input: secretKey }))
  return s.toCompactRawBytes()
}

export function verifySignature({
  message,
  signature,
  public_key,
}: {
  message: Hex
  signature: Hex
  public_key: Hex
}): boolean {
  // const m = b4a.isBuffer(message) ? b4a.from(message) : message
  // const s = b4a.isBuffer(signature) ? b4a.from(signature) : signature
  // const pk = b4a.isBuffer(public_key) ? public_key : hex2buf(public_key)
  return verify(signature, createHash({ str: message }), public_key)
}

export function randomBytes(n: number): Uint8Array {
  const buf = b4a.allocUnsafe(n)
  sodium.randombytes_buf(buf)
  return buf
}

export function getAddress({ public_key }: { public_key: Uint8Array }): string {
  return `0x${buf2hex({ input: sha3_256(public_key).slice(-20) })}`
}

export function free(secureBuf: { secure: boolean }): void {
  if (secureBuf.secure) sodium.sodium_free(secureBuf)
}
