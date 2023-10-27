import { ZodTypeAny } from "zod"
import _ from "lodash"
import { buf2hex, createHash, decrypt, encrypt, hex2buf, keyPair, signMessage } from "@/security/common"
import { pack, unpack } from "msgpackr"
import { get, set, del } from "idb-keyval"
import { getActiveUser } from "@/libraries/active_user"
import { set as setCF, get as getCF, keyHash } from "@/libraries/cloudflare"
import { UserT } from "@/data/loaders/user"
import { error, info } from "@/libraries/logging"
import config from "@/config"
import { verify } from "@noble/secp256k1"
import { emit } from "@/libraries/events"

// Function to merge the current state with the updated state
export const mergeState = <T>(state: T, updated_state: T): T => {
  // If state is null, we assume this is a brand new store
  if(state === null) return updated_state
  // If both states are arrays, merge them based on the "id" property
  if (Array.isArray(state) && Array.isArray(updated_state)) {
    return _.unionBy(state, updated_state, "id") as any
  }
  // If both states are objects, merge them
  else if (_.isObject(state) && _.isObject(updated_state)) {
    return { ...state, ...updated_state } as T
  }
  // Throw an error if the states are not valid
  throw new Error("Invalid state or updated_state")
}

async function processForRemote({
  data,
  key_pair,
  enc_key,
  destroy,
}: {
  data: any
  key_pair: any
  enc_key: any
  destroy?: boolean
}) {
  const enc_vstate = encrypt({ data, key: enc_key })
  const packed_vstate = pack(enc_vstate)
  const signature = await signMessage(packed_vstate, key_pair.secret_key)
  const enc_data = pack({ data: enc_vstate, signature, public_key: key_pair.public_key, destroy })
  return enc_data
}

export function getRemoteKey({ key, name, active_user }: { key: string; name: string; active_user: UserT }) {
  let remote_key = ""
  if (name !== "user") {
    remote_key = keyHash(active_user?.master_key + key)
  } else {
    remote_key = keyHash(active_user?.master_key + active_user?.meta?.username)
  }
  return remote_key
}

// Function to create a store with encryption and decryption capabilities
export const store = async <TData>({
  name,
  username,
  user,
  enc_key,
  initial,
  local_only = false,
  _debug = undefined,
  ztype,
}: {
  name: string
  username?: string
  user?: UserT
  enc_key?: string
  initial: Function
  local_only?: boolean
  _debug?: TData
  ztype: ZodTypeAny
}): Promise<{
  get: () => TData
  set: (data: TData, no_storage?: boolean, replace?: boolean) => void
  destroy: () => void
} | null> => {
  // Log the creation of the store
  info({ message: `setting up store for ${name}` })
  // Get the active user and create a master password hash
  const active_user = getActiveUser()

  // If username or encryption key is not provided, get them from the active user
  if (!username || !enc_key) {
    if (!active_user) return null
    username = active_user.meta.username
    enc_key = active_user.master_password
  }

  // Create a key for the store and try to get the store from the local storage
  let key = `${username}:${name}`
  let local_store = await get(key).catch((e) => {
    console.log("error getting store")
  })

  // Decrypt the store if it exists and local encryption is enabled, otherwise use the initial data
  let s: TData = local_store
    ? config.features.local_encryption
      ? decrypt({ ...unpack(local_store), key: enc_key })
      : local_store
    : await initial()

  let key_pair: { public_key: Uint8Array; secret_key: Uint8Array } | null = null
  let remote_key: string | null = null
  let cf_store: any = null
  if (!["users"].includes(name) && !local_only) {
    if (!active_user) {
      error({ message: "no active user" })
      return null
    }

    // Create a key pair from the master key
    key_pair = keyPair({ seed: hex2buf({ input: active_user?.master_key }) })
    remote_key = getRemoteKey({ name, key, active_user })

    // Start checking cloud storage but initialize the store from IDB
    getCF({ key: remote_key }).then(async (cf_store: any) => {
      // If the cloud store is larger than the local store, decrypt the cloud store
      if (cf_store && buf2hex({ input: cf_store.public_key }) === active_user.public_key) {
        const sig_valid = verify(cf_store.signature, createHash({ str: pack(cf_store.data) }), cf_store.public_key)
        if (!sig_valid) {
          error({ message: "invalid signature" })
        } else {
          const cf_s = decrypt({ ...cf_store.data, key: enc_key })
          const cf_vstate = ztype.safeParse(cf_s) as { data?: TData; success?: boolean }
          if (cf_vstate.success && cf_vstate?.data) {
            if ((_.isArray(s) && _.size(s) === 0) || !s) s = cf_vstate?.data
            if (
              s &&
              _.isObject(cf_vstate?.data) &&
              (_.get(cf_vstate, "data._updated") || 0) > (_.get(s, "_updated") || 0)
            ) {
              s = cf_vstate?.data
              await API.set(s)
              emit({ type: "store_update", data: { name } })
            } else if (s && _.isArray(cf_vstate?.data) && cf_vstate?.data.length > (_.size(s) || 0)) {
              s = cf_vstate?.data
              await API.set(s)
              emit({ type: "store_update", data: { name } })
            }
          }
        }
      }
    })
  }
  // If the store exists, validate it against the schema and save it to the local storage if it doesn't exist
  if (s) {
    const s_check = ztype.safeParse(s)
    if (!s_check.success) {
      console.error(s_check.error)
      throw new Error("Store data does not match schema")
    }
    if (!local_store) {
      config.features.local_encryption && enc_key ? set(key, pack(encrypt({ data: s, key: enc_key }))) : set(key, s)
    }

    if (!cf_store) {
      if (key_pair && remote_key && name !== "users") {
        const enc_data = await processForRemote({ data: s, key_pair, enc_key })
        setCF({ key: remote_key, value: enc_data })
      }
    }
  }
  // Return functions to get and set the store data
  const API = {
    get: (): TData => s,
    set: async (data: TData, no_storage?: boolean, replace?: boolean) => {
      // Log the update of the store
      info({ message: `updating store for ${name}` })
      if (!data) return
      // Merge the current state with the new data and validate it against the schema
      const updated_state = !replace ? mergeState(s, data) : data
      // @ts-ignore
      if (ztype._def.shape?._updated || ztype._cached?.keys?.includes("_updated")) {
        // @ts-ignore
        updated_state._updated = new Date().getTime()
      }
      const vstate = ztype.safeParse(updated_state)
      if (!vstate.success) {
        throw new Error("Store data does not match schema")
      }
      s = vstate.data

      // If no_storage is true, don't save the data
      if (no_storage) return
      if (!enc_key) throw new Error("No encryption key")
      // If a key pair exists, encrypt the data and save it to the cloud storage
      if (key_pair && remote_key && name !== "users" && !local_only) {
        const enc_data = await processForRemote({ data: vstate.data, key_pair, enc_key })
        setCF({ key: remote_key, value: enc_data })
      }
      // Save the data to the local storage
      if (config.features.local_encryption) await set(key, pack(encrypt({ data: vstate.data, key: enc_key })))
      else await set(key, vstate.data)
      return true
    },
    destroy: async () => {
      await del(key)
      if (remote_key) {
        const enc_data = await processForRemote({ data: 1, key_pair, enc_key, destroy: true })
        setCF({ key: remote_key, value: enc_data })
      }
      return true
    },
  }
  return API
  // } else return s //throw new Error("Store not found")
}
