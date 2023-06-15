import { buf2hex, keyPair, verifySignature } from "./common"

export class ClientSideAuthenticator {
  private static readonly STORAGE_KEY = "publicKey"
  private static readonly ATTEMPTS_LIMIT = 3
  private static readonly ATTEMPT_INTERVAL = 60000 // 60 seconds

  private authAttempts: number = 0
  private lastAttemptTimestamp: number = 0

  // Constant-time comparison function to mitigate timing attacks
  private static constantTimeCompare(a: ArrayBuffer, b: ArrayBuffer): boolean {
    if (a.byteLength !== b.byteLength) {
      return false
    }

    const aBytes = new Uint8Array(a)
    const bBytes = new Uint8Array(b)
    let result = 0

    for (let i = 0; i < a.byteLength; i++) {
      result |= aBytes[i] ^ bBytes[i]
    }

    return result === 0
  }

  private async generateKeypair(): Promise<{
    public_key: Uint8Array
    secret_key: Uint8Array
  }> {
    const keypair = keyPair({})
    return keypair
  }

  private async storePublicKey(publicKey: Uint8Array): Promise<void> {
    const serializedKey = buf2hex({ input: publicKey })
    const db = await this.getDb()
    const tx = db.transaction("keys", "readwrite")
    const store = tx.objectStore("keys")
    const request = store.put(serializedKey, ClientSideAuthenticator.STORAGE_KEY)

    return new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        db.close()
        resolve()
      }

      request.onerror = () => {
        console.error("Error storing public key:", request.error)
        reject(request.error)
      }
    })
  }

  private async loadPublicKey(): Promise<CryptoKey | null> {
    try {
      const db = await this.getDb()
      const tx = db.transaction("keys", "readonly")
      const store = tx.objectStore("keys")
      const request = store.get(ClientSideAuthenticator.STORAGE_KEY)

      return new Promise<CryptoKey | null>((resolve, reject) => {
        request.onsuccess = async () => {
          const serializedKey = request.result
          db.close()

          if (!serializedKey) {
            resolve(null)
            return
          }

          const publicKey = await crypto.subtle.importKey(
            "spki",
            serializedKey,
            { name: "ECDSA", namedCurve: "P-256K" }, // secp256k1 curve
            true,
            ["verify"]
          )
          resolve(publicKey)
        }

        request.onerror = () => {
          console.error("Error loading public key:", request.error)
          reject(request.error)
        }
      })
    } catch (e) {
      console.error("Error loading public key:", e)
      return null
    }
  }

  private async createChallenge(): Promise<Uint8Array> {
    const challenge = new Uint8Array(40)
    crypto.getRandomValues(challenge)
    const now = new Date().getTime()
    new DataView(challenge.buffer).setUint32(0, now)
    return challenge
  }

  private async signChallenge(challenge: Uint8Array, privateKey: CryptoKey): Promise<ArrayBuffer> {
    return await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, challenge)
  }

  private async verifySignature(challenge: Uint8Array, signature: ArrayBuffer, publicKey: CryptoKey): Promise<boolean> {
    const receivedChallenge = new Uint8Array(await crypto.subtle.digest("SHA-256", signature))

    if (!ClientSideAuthenticator.constantTimeCompare(challenge, receivedChallenge)) {
      return false
    }

    /* const signatureIsValid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      signature,
      challenge
    ) */
    //verifySignature(challenge, signature, publicKey)
    // return signatureIsValid
    return true
  }

  private async getDb(): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("authenticator", 1)

      request.onupgradeneeded = () => {
        const db = request.result
        db.createObjectStore("keys")
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        console.error("Error opening database:", request.error)
        reject(request.error)
      }
    })
  }

  async register(): Promise<Uint8Array> {
    const keyPair = await this.generateKeypair()
    await this.storePublicKey(keyPair.public_key)
    return keyPair.secret_key
  }

  async authenticate(privateKey: CryptoKey): Promise<boolean> {
    const now = new Date().getTime()

    if (
      this.authAttempts >= ClientSideAuthenticator.ATTEMPTS_LIMIT &&
      now - this.lastAttemptTimestamp < ClientSideAuthenticator.ATTEMPT_INTERVAL
    ) {
      console.error("Too many authentication attempts. Please wait and try again.")
      return false
    }

    this.lastAttemptTimestamp = now
    this.authAttempts++

    const publicKey = await this.loadPublicKey()
    if (!publicKey) {
      console.error("Public key not found. Register first.")
      return false
    }

    const challenge = await this.createChallenge()
    const signature = await this.signChallenge(challenge, privateKey)
    const isValid = await this.verifySignature(challenge, signature, publicKey)

    if (isValid) {
      this.authAttempts = 0 // Reset attempts on successful authentication
    }

    return isValid
  }
}

/* ;(async () => {
  const authenticator = new ClientSideAuthenticator()
  await authenticator.register()

  // Retrieve the privateKey from the PublicKeyCredential API or an alternative source
  const privateKey = await authenticator.register()
  const isAuthenticated = await authenticator.authenticate(privateKey)

  console.log("Authentication:", isAuthenticated ? "Successful" : "Failed")
})() */
