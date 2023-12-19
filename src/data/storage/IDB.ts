import { ZodTypeAny } from "zod"
import _ from "lodash"
import {
  buf2hex,
  createHash,
  decrypt,
  encrypt,
  hex2buf,
  keyPair,
  signMessage,
} from "@/security/common"
import { pack, unpack } from "msgpackr"
import { get, set, del } from "idb-keyval"
import { getActiveUser } from "@/libraries/active_user"
import { set as setCF, get as getCF, keyHash } from "@/libraries/cloudflare"
import { UserT } from "@/data/loaders/user"
import { error, info } from "@/libraries/logging"
import config from "@/config"
import { verify } from "@noble/secp256k1"
import { emit, listen } from "@/libraries/events"
import { createMemoryState, getMemoryState } from "@/libraries/memory"
import { get as getLS, set as setLS } from "@/data/storage/localStorage"

// Function to merge the current state with the updated state
export const mergeState = <T>(state: T, updated_state: T): T => {
  // If state is null, we assume this is a brand new store
  if (state === null) return updated_state
  // If both states are arrays, merge them based on the "id" property
  if (Array.isArray(state) && Array.isArray(updated_state)) {
    return _.unionBy(state, updated_state, "id") as any
  }
  // If both states are objects, merge them
  else if (_.isObject(state) && _.isObject(updated_state)) {
    _.merge(state, updated_state)
    return state as T
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
  const enc_data = pack({
    data: enc_vstate,
    signature,
    public_key: key_pair.public_key,
    destroy,
  })
  return enc_data
}

export function getRemoteKey({
  key,
  name,
  active_user,
}: {
  key: string
  name: string
  active_user: UserT
}) {
  let remote_key = ""
  if (name !== "user") {
    remote_key = keyHash(active_user?.master_key + key)
  } else {
    remote_key = keyHash(active_user?.master_key + active_user?.meta?.username)
  }
  return remote_key
}

export async function getRemote({
  mem,
  remote_key,
  name,
  active_user,
  enc_key,
  ztype,
  s,
  API,
}: {
  mem: any
  remote_key: string
  name: string
  active_user: UserT
  enc_key: string
  ztype: ZodTypeAny
  s: any
  API: any
}) {
  // Check if a remote key is provided
  if (!remote_key) {
    error({ message: "no remote key" })
    return
  }

  // Check the last time the store was checked for updates
  const lasted_checked = getLS({ key: `${remote_key}-last_checked` })
  if (lasted_checked) {
    const now = new Date().getTime()
    const diff = now - lasted_checked

    // If the time difference is less than the sync interval, return
    if (diff < config.DB.CF.sync_interval) {
      return
    }
  }

  // Set the store status to "syncing"
  mem[name] = { status: "syncing", updated_at: new Date().getTime() }

  // Get the store from the cloud storage
  try {
    const cf_store = await getCF({ key: remote_key })

    // If the store exists and the public key matches the active user's public key, decrypt the store
    if (
      cf_store &&
      buf2hex({ input: cf_store.public_key }) === active_user.public_key
    ) {
      // Check the signature of the store
      const sig_valid = verify(
        cf_store.signature,
        createHash({ str: pack(cf_store.data) }),
        cf_store.public_key,
      )

      // If the signature is invalid, set the store status to "error"
      if (!sig_valid) {
        error({ message: "invalid signature" })
        mem[name] = { status: "error", updated_at: new Date().getTime() }
      } else {
        // Decrypt the store
        const cf_s = decrypt({ ...cf_store.data, key: enc_key })
        const cf_vstate = ztype.safeParse(cf_s) as {
          data?: any
          success?: boolean
        }

        // If the store is valid, update the local store
        if (cf_vstate.success && cf_vstate?.data) {
          if ((_.isArray(s) && _.size(s) === 0) || !s) s = cf_vstate?.data

          // If the updated timestamp of the remote store is greater than the local store, update the local store
          const remote_updated = _.get(cf_vstate, "data._updated") || 0
          const local_updated = _.get(s, "_updated") || 0
          if (
            s &&
            _.isObject(cf_vstate?.data) &&
            remote_updated > local_updated
          ) {
            s = cf_vstate?.data
            // await API.set(s, false, true, true);
            // emit({ type: "store/update", data: { session_id: name } })
          } else if (
            s &&
            _.isArray(cf_vstate?.data) &&
            cf_vstate?.data.length > (_.size(s) || 0)
          ) {
            s = cf_vstate?.data
            // await API.set(s, false, true, false);
            // emit({ type: "store/update", data: { session_id: name } })
          } else if (
            s &&
            _.isArray(cf_vstate?.data) &&
            cf_vstate?.data.length < (_.size(s) || 0)
          ) {
            // this is a broken sync, so we need to overwrite the remote store
            await API.set(s)
          } else {
            // If the remote store has fewer messages than the local store, handle the situation accordingly
          }
          mem[name] = { status: "ready", updated_at: new Date().getTime() }
          return s
        }
      }
    } else {
      // If the store doesn't exist or the public key doesn't match, handle the situation accordingly
      mem[name] = { status: "error", updated_at: new Date().getTime() }
    }
    return false
  } catch (e) {
    // Handle any errors that occur during the process
    mem[name] = { status: "error", updated_at: new Date().getTime() }
  }
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
  // get memory for stores
  let mem = createMemoryState({
    id: "stores",
    state: {
      [name]: { status: "initializing", updated_at: new Date().getTime() },
    },
  })

  // Log the creation of the store
  info({ message: `setting up store for ${name}` })

  // Get the active user and create a master password hash
  const active_user = getActiveUser()
  if (!active_user && name !== "users") {
    error({ message: "no active user" })
    return null
  }
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
    mem[name] = { status: "error", updated_at: new Date().getTime() }
  })

  // Setup the store variables
  let store: TData
  let key_pair: { public_key: Uint8Array; secret_key: Uint8Array } | null = null
  let remote_key: string = ""
  let _new_store = false
  let skip_sync = false
  let cf_store: any = null

  // Decrypt the store if it exists and local encryption is enabled, otherwise use the initial data
  if (local_store) {
    // If encryption is enabled, decrypt the store
    if (config.features.local_encryption) {
      store = decrypt({ ...unpack(local_store), key: enc_key })
    } else {
      store = local_store
    }
  } else {
    // No store found, so let's initialize one
    store = await initial()
    _new_store = true
    // Mark the store ready
    mem[name] = { status: "ready", updated_at: new Date().getTime() }
  }

  // If the store is not "users" and we have an active user, generate key pair and remote key
  if (name !== "users" && active_user) {
    key_pair = keyPair({
      seed: hex2buf({ input: active_user?.master_key }),
    })
    remote_key = getRemoteKey({ name, key, active_user })
  }

  // Return API to get and set the store data
  const API = {
    get: (): TData => {
      // if(active_user && enc_key && remote_key) getRemote({ mem, remote_key, name, active_user, enc_key, ztype, s: store, API })
      return store
    },
    set: async (
      data: TData,
      no_storage?: boolean,
      replace?: boolean,
      skip_sync?: boolean,
    ) => {
      // Check we have everything needed
      if (!data) return
      if (!enc_key) return error({ message: "No encryption key" })
      if (!ztype) return error({ message: "No schema" })
      if (!name) return error({ message: "No name" })

      // Log the update of the store
      info({ message: `updating store for ${name}` })

      // Merge the current state with the new data and validate it against the schema
      const updated_state = !replace ? mergeState(store, data) : data

      // Check if _updated timestamp exists, if so, update it
      // @ts-ignore
      if (
        ztype._def.shape?._updated ||
        // @ts-ignore
        ztype._cached?.keys?.includes("_updated")
      ) {
        // @ts-ignore
        updated_state._updated = new Date().getTime()
      }

      // Validate the updated state against the schema
      const vstate = ztype.safeParse(updated_state)
      if (!vstate.success) {
        throw new Error("Store data does not match schema")
      }

      // Set the validated data as the store
      store = vstate.data

      // If no_storage is true, don't save the data
      if (no_storage) return

      // If a key pair exists, encrypt the data and save it to the cloud storage
      if (
        key_pair &&
        remote_key &&
        name !== "users" &&
        !local_only &&
        !skip_sync
      ) {
        const enc_data = await processForRemote({
          data: vstate.data,
          key_pair,
          enc_key,
        })
        setCF({ key: remote_key, value: enc_data })
      }

      // Save the data to the local storage
      if (config.features.local_encryption)
        await set(key, pack(encrypt({ data: vstate.data, key: enc_key })))
      else await set(key, vstate.data)

      // Emit an event to notify the store has been updated
      emit({
        type: "store/update",
        data: {
          target: name,
        },
      })
      return true
    },
    destroy: async () => {
      await del(key)
      if (remote_key) {
        const enc_data = await processForRemote({
          data: 1,
          key_pair,
          enc_key,
          destroy: true,
        })
        setCF({ key: remote_key, value: enc_data })
      }
      return true
    },
    sync: async () => {
      if (!active_user || !enc_key) return
      mem[name] = { status: "syncing", updated_at: new Date().getTime() }
      const cf_store = await getRemote({
        mem,
        remote_key,
        name,
        active_user,
        enc_key,
        ztype,
        s: store,
        API,
      })
      if (cf_store) {
        await API.set(cf_store, false, true, true)
        emit({
          type: "store/update",
          data: { target: name, session: cf_store },
        })
        mem[name] = { status: "ready", updated_at: new Date().getTime() }
        return true
      } else {
        mem[name] = { status: "ready", updated_at: new Date().getTime() }
        return false
      }
    },
  }

  async function setStore({ store }: { store: TData }) {
    const s_check = ztype.safeParse(store)
    if (!s_check.success) {
      console.error(s_check.error)
      mem[name] = { status: "error", updated_at: new Date().getTime() }
      throw new Error("Store data does not match schema")
    }
    // if (!local_store) {
    if (config.features.local_encryption && enc_key) {
      await set(key, pack(encrypt({ data: store, key: enc_key })))
    } else {
      await set(key, store)
    }
    emit({ type: "store/update", data: { target: name, session: store } })

    // mem[name] = { status: "ready", updated_at: new Date().getTime() }
  }

  // If the store is not "users" and we have an active user, check if the cloud storage has a newer version
  if (!["users"].includes(name) && !local_only) {
    if (!active_user) {
      error({ message: "no active user" })
      return null
    }
    getRemote({
      mem,
      remote_key,
      name,
      active_user,
      enc_key,
      ztype,
      s: store,
      API,
    }).then((cf_store) => {
      if (cf_store) {
        setStore({ store: cf_store })
      }
    })
  }

  // If the store exists, validate it against the schema and save it to the local storage if it doesn't exist
  if (store) {
    await setStore({ store })

    if (["user", "appstate", "ais"].includes(name)) {
      setInterval(
        async () => {
          const synced = await API.sync()
          // console.log(`synced ${name}, ${synced ? "new data" : "no new data"}`)
        },
        _.get(
          config,
          "defaults.user.data.cloud_storage.data_backup.auto_sync_interval" ||
            1000 * 60 * 5,
        ),
      )
    }
    // }

    /* if (!cf_store && key_pair && remote_key && name !== "users" && !skip_sync) {
      const enc_data = await processForRemote({
        data: store,
        key_pair,
        enc_key,
      })
      mem[name] = { status: "syncing", updated_at: new Date().getTime() }
      setCF({ key: remote_key, value: enc_data }).then(() => {
        mem[name] = { status: "ready", updated_at: new Date().getTime() }
      })
    } else {
      mem[name] = { status: "ready", updated_at: new Date().getTime() }
    } */
  }

  return API
}
