import { z } from "zod"

export const KeyPairS = z.object({
  public_key: z.instanceof(Uint8Array),
  secret_key: z.instanceof(Uint8Array),
})

export const SecurePasswordS = z.object({
  password: z.string(),
  salt: z.string(),
})

export const VerifyPasswordS = z.object({
  hash: z.instanceof(Uint8Array),
  password: z.string(),
  salt: z.string(),
})

export const EncryptS = z.object({
  key: z.string(),
  data: z.unknown(),
})

export const DecryptS = z.object({
  key: z.string(),
  cipher: z.instanceof(Uint8Array),
  nonce: z.string(),
})

export const SignatureS = z.object({
  signature: z.instanceof(Uint8Array),
  public_key: z.instanceof(Uint8Array),
})