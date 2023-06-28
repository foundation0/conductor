import { ZodTypeAny, z } from "zod"
import _ from "lodash"
import { decrypt, encrypt } from "@/security/common"
import { pack, unpack } from "msgpackr"
import { DecryptS } from "@/data/schemas/security"
import { get, set, createStore } from "idb-keyval"
import { getActiveUser } from "@/components/libraries/active_user"

export const store = async <TData>({
  name,
  username,
  enc_key,
  initial,
  _debug = undefined,
  ztype,
}: {
  name: string
  username?: string
  enc_key?: string
  initial: Function
  _debug?: TData
  ztype: ZodTypeAny
}): Promise<{ get: () => TData; set: (data: TData, no_storage?: boolean) => void } | null> => {
  // if (_debug) return {_debug // for testing
  if (!username || !enc_key) {
    const active_user = getActiveUser()
    if (!active_user) return null //{ get: () => null as TData, set: () => null }
    username = active_user.meta.username
    enc_key = active_user.master_password
  }
  // const DB = createStore(username, "prompt")
  let key = `${username}:${name}`
  let store = await get(key).catch((e) => {
    console.log("error getting store")
  })
  let s: TData = store ? decrypt({ ...unpack(store), key: enc_key }) : await initial()
  if (!store && s) set(key, pack(encrypt({ data: s, key: enc_key })))
  if (s) {
    const s_check = ztype.safeParse(s)
    if (!s_check.success) {
      console.error(s_check.error)
      throw new Error("Store data does not match schema")
    }
    return {
      get: (): TData => s,
      set: async (data: TData, no_storage?: boolean) => {
        const updated_state = { ...s, ...data }
        const vstate = ztype.safeParse(updated_state)
        if (!vstate.success) {
          throw new Error("Store data does not match schema")
        }
        s = vstate.data
        if (no_storage) return
        if (!enc_key) throw new Error("No encryption key")
        set(key, pack(encrypt({ data: vstate.data, key: enc_key })))
        return true
      },
    }
  } else throw new Error("Store not found")
}
