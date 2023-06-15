import b4a from "b4a"
import * as crypto from "../../src/security/common"
import { expect, test } from "vitest"
import { ethers } from "ethers"

test("createHash", function (t) {
  const hash = crypto.createHash({ str: "test" })
  expect(b4a.isBuffer(hash)).toBeTruthy()
  // expect(b4a.toString(hash, 'hex'), '928b20366943e2afd11ebc0eae2e53a93bf177a4fcf35bcc64d503704e65e202')
  expect(b4a.toString(hash, "hex")).toEqual("4878ca0425c739fa427f7eda20fe845f6b2e46ba5fe2a14df5b1e32f50603215")
})

test("randomBytes", function (t) {
  const buffer = crypto.randomBytes(100)
  expect(b4a.isBuffer(buffer)).toBeTruthy()
  expect(crypto.randomBytes(100)).not.toEqual(buffer)
})

test("key pair", function (t) {
  const keyPair = crypto.keyPair({})

  expect(keyPair.public_key).toHaveLength(33)
  expect(keyPair.secret_key).toHaveLength(32)
})

test("validate key pair", function (t) {
  const keyPair1 = crypto.keyPair({})
  const keyPair2 = crypto.keyPair({})

  expect(crypto.validateKeyPair({ public_key: keyPair1.public_key, secret_key: keyPair2.secret_key })).toBeFalsy()
  expect(crypto.validateKeyPair({ public_key: keyPair1.public_key, secret_key: keyPair1.secret_key })).toBeTruthy()
})

test("keypair should be valid Ethereum wallet", function (t) {
  const keyPair = crypto.keyPair({})
  const address = crypto.getAddress({ public_key: keyPair.public_key })
  expect(ethers.isAddress(address)).toBeTruthy()
})


test("sign", async function (t) {
  const keyPair = crypto.keyPair({})
  const message = b4a.from("hello world")

  const signature = await crypto.signMessage(message, keyPair.secret_key)
  expect(signature).toHaveLength(64)
  expect(crypto.verifySignature({ message, signature, public_key: keyPair.public_key })).toBeTruthy()
  expect(crypto.verifySignature({ message, signature: b4a.alloc(64), public_key: keyPair.public_key })).toBeFalsy()
})

test("should encrypt and decrypt a data package from string, object and buffer", (t) => {
  let key = "0x6261636b626f6e653a2f2f696e646578"
  let data
  let encrypted_data
  let decrypted_data

  // object
  data = { hello: "world", foo: Buffer.from("bar") }
  encrypted_data = crypto.encrypt({ key, data })
  expect(Object.keys(encrypted_data)).toEqual(["cipher", "nonce"])
  decrypted_data = crypto.decrypt({
    key,
    cipher: Buffer.alloc(0),
    nonce: "",
    ...encrypted_data,
  })
  expect(typeof decrypted_data, "object")
  expect(decrypted_data).toEqual(data)

  // buffer
  data = Buffer.from("hello")
  encrypted_data = crypto.encrypt({ key, data })
  expect(Object.keys(encrypted_data)).toEqual(["cipher", "nonce"])
  decrypted_data = crypto.decrypt({
    key,
    cipher: Buffer.alloc(0),
    nonce: "",
    ...encrypted_data,
  })
  expect(Buffer.isBuffer(decrypted_data)).toBeTruthy()
  expect(decrypted_data).toEqual(data)

  // object
  data = "hello"
  encrypted_data = crypto.encrypt({ key, data })
  expect(Object.keys(encrypted_data)).toEqual(["cipher", "nonce"])
  decrypted_data = crypto.decrypt({
    key,
    cipher: Buffer.alloc(0),
    nonce: "",
    ...encrypted_data,
  })
  expect(typeof decrypted_data, "string")
  expect(decrypted_data).toEqual(data)
})

test("should create & verify secure hashes", (t) => {
  const password = "5up3r53cur3"
  const hash = crypto.securePassword({ password, salt: "test" })
  // expect(hash.byteLength, 128)
  expect(hash.byteLength).toEqual(32)
  expect(crypto.verifyPassword({ hash, password, salt: "test" })).toBeTruthy()
})

