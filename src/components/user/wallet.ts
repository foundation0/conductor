import config from "@/config"
import { GetBalanceT, GetWalletStatusT } from "@/data/schemas/pe"
import { PEClient, PEClientNS } from "@/libraries/pe"
import { hex2buf, keyPair, signMessage, buf2hex, getAddress } from "@/security/common"
import _ from "lodash"
import { nanoid } from "nanoid"

export async function getBalance({
  public_key,
  master_key,
}: {
  public_key: string
  master_key: string
}): Promise<string | number> {
  const user_id = getAddress({ public_key: hex2buf({ input: public_key }) })

  // generate a random nonce for signing
  const nonce = nanoid()

  // generate a signature for the nonce
  const { secret_key } = keyPair({ seed: hex2buf({ input: master_key }) })
  const signature = await signMessage(nonce, secret_key)

  // create request payload
  const payload: GetBalanceT = {
    uid: nanoid(),
    user_id,
    auth: {
      c: nonce,
      s: buf2hex({ input: signature }),
      pk: public_key,
    },
    type: "GetBalance",
  }

  let b: any = await new Promise(async (resolve) => {
    let output: any = {}
    const ULE = await PEClient({
      host: `${config.services.ule_URI}/PE`,
      onData: (data) => {
        output = { ...output, ...data }
      },
      onDone: (data) => {
        resolve(output)
      },
      onError: (err) => {
        const error = {
          code: err.code || "unknown",
          message: err.error || err.message || err || "unknown",
          status: "error",
          surpress: false,
        }
        if (error.message === "canceled") return resolve(output)
      },
    })
    ULE.compute(payload)
  })
  const { balance } = b
  return balance.toFixed(2) || "error"
}
export async function getBytesBalance({
  public_key,
  master_key,
}: {
  public_key: string
  master_key: string
}): Promise<string | number> {
  const user_id = getAddress({ public_key: hex2buf({ input: public_key }) })

  // generate a random nonce for signing
  const nonce = nanoid()

  // generate a signature for the nonce
  const { secret_key } = keyPair({ seed: hex2buf({ input: master_key }) })
  const signature = await signMessage(nonce, secret_key)

  // create request payload
  const payload: GetBalanceT = {
    uid: nanoid(),
    user_id,
    auth: {
      c: nonce,
      s: buf2hex({ input: signature }),
      pk: public_key,
    },
    type: "GetBytesBalance",
  }

  let b: any = await new Promise(async (resolve) => {
    let output: any = {}
    const ULE = await PEClient({
      host: `${config.services.ule_URI}/PE`,
      onData: (data) => {
        output = { ...output, ...data }
      },
      onDone: (data) => {
        resolve(output)
      },
      onError: (err) => {
        const error = {
          code: err.code || "unknown",
          message: err.error || err.message || err || "unknown",
          status: "error",
          surpress: false,
        }
        if (error.message === "canceled") return resolve(output)
      },
    })
    ULE.compute(payload)
  })
  const { balance } = b
  return _.isNumber(balance) ? balance : "error"
}

export async function getFreeBalance({
  public_key,
  master_key,
}: {
  public_key: string
  master_key: string
}): Promise<string | number> {
  const user_id = getAddress({ public_key: hex2buf({ input: public_key }) })

  // generate a random nonce for signing
  const nonce = nanoid()

  // generate a signature for the nonce
  const { secret_key } = keyPair({ seed: hex2buf({ input: master_key }) })
  const signature = await signMessage(nonce, secret_key)

  // create request payload
  const payload: GetBalanceT = {
    uid: nanoid(),
    user_id,
    auth: {
      c: nonce,
      s: buf2hex({ input: signature }),
      pk: public_key,
    },
    type: "GetFreeBalance",
  }

  // send request to the server
  const response = await fetch(config.services.wallet_URI + "/PE", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).catch((e) => {
    console.error(e)
  })

  const free_balance = await response?.json()

  return free_balance || "error"
}

export async function getWalletStatus({
  public_key,
  master_key,
}: {
  public_key: string
  master_key: string
}): Promise<string> {
  const user_id = getAddress({ public_key: hex2buf({ input: public_key }) })

  // generate a random nonce for signing
  const nonce = nanoid()

  // generate a signature for the nonce
  const { secret_key } = keyPair({ seed: hex2buf({ input: master_key }) })
  const signature = await signMessage(nonce, secret_key)

  // create request payload
  const payload: GetWalletStatusT = {
    uid: nanoid(),
    user_id,
    auth: {
      c: nonce,
      s: buf2hex({ input: signature }),
      pk: public_key,
    },
    type: "GetWalletStatus",
  }

  // send request to the server
  let s: any = await new Promise(async (resolve) => {
    let output: any = {}
    const ULE = await PEClient({
      host: `${config.services.ule_URI}/PE`,
      onData: (data) => {
        output = { ...output, ...data }
      },
      onDone: (data) => {
        resolve(output)
      },
      onError: (err) => {
        const error = {
          code: err.code || "unknown",
          message: err.error || err.message || err || "unknown",
          status: "error",
          surpress: false,
        }
        if (error.message === "canceled") return resolve(output)
      },
    })
    ULE.compute(payload)
  })

  const { status } = s
  return status || "error"
}
