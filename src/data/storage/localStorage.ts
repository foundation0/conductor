import { ZodTypeAny, z } from "zod"
import _ from "lodash"
import { decrypt, encrypt } from "@/security/common"
import b4a from "b4a"
import { pack, unpack } from "msgpackr"

export function checkForLocalStorage() {
  try {
    localStorage.setItem("test", "test")
    localStorage.removeItem("test")
    return true
  } catch (e) {
    return false
  }
}

export const set = function ({ key, value }: { key: string; value: any }) {
  if (checkForLocalStorage())
    localStorage.setItem(key, b4a.toString(b4a.isBuffer(value) ? value : pack(value), "base64"))
}

export const get = function ({ key }: { key: string }) {
  if (checkForLocalStorage()) {
    try {
      const d = localStorage.getItem(key)
      if (!d) return null
      const data = b4a.from(d, "base64")
      return unpack(data)
    } catch (error) {
      return false
    }
  }
  return null
}

export const del = function ({ key }: { key: string }) {
  if (checkForLocalStorage()) localStorage.removeItem(key)
}

export const store = async <TData>({
  name,
  username,
  enc_key,
  initial,
  _debug = undefined,
  ztype,
}: {
  name: string
  username: string
  enc_key: string
  initial: Function
  _debug?: TData
  ztype: ZodTypeAny
}): Promise<{ get: () => TData; set: (data: TData, no_storage?: boolean) => void }> => {
  // if (_debug) return {_debug // for testing
  if (!username || !enc_key) return { get: () => null as TData, set: () => null }
  const store = checkForLocalStorage() ? localStorage.getItem(`${username}:${name}`) : null
  let s: TData = store ? decrypt({ ...JSON.parse(store), key: enc_key }) : await initial()
  // if (!store) localStorage.setItem(name, JSON.stringify(s))
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
        if (checkForLocalStorage())
          localStorage.setItem(`${username}:${name}`, JSON.stringify(encrypt({ data: vstate.data, key: enc_key })))
        return true
      },
    }
  } else throw new Error("Store not found")
}
