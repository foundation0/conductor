import config from "@/config"
import { error, info } from "./logging"
import { unpack } from "msgpackr"
import { buf2hex, createHash } from "@/security/common"
import pDebounce from "p-debounce"

export function keyHash(str: string) {
  return buf2hex({ input: createHash({ str }) })
}

type SetT = { key: string; value: Uint8Array | Buffer }

const setters = new Map()
export function set({ key, value }: SetT) {
  if (!setters.has(key)) {
    info({ message: `setting up CF setter for ${key}` })
    setters.set(
      key,
      pDebounce(async ({ key, value }: SetT) => {
        await setCF({ key, value })
        return true
      }, config.DB.CF.set_limit)
    )
    return setCF({ key, value })
  } else {
    info({ message: `getting CF setter for ${key}` })
    return setters.get(key)({ key, value })
  }
}

const getters = new Map()
export function get({ key }: { key: string }) {
  if (!getters.has(key)) {
    info({ message: `setting up CF getter for ${key}` })
    getters.set(
      key,
      pDebounce(async ({ key }: { key: string }) => {
        const d = await getCF({ key })
        return d
      }, config.DB.CF.get_limit)
    )
    return getCF({ key })
  } else {
    info({ message: `getting CF getter for ${key}` })
    return getters.get(key)({ key })
  }
}

export async function setCF({ value, key }: SetT) {
  try {
    const res = await fetch(`${config.DB.URI}${key}`, {
      method: "POST",
      body: value,
    })
    if (res.ok) {
      const data = await res.text()
      return data
    } else {
      return null
    }
  } catch (e: any) {
    return error({ message: e?.message, data: e })
  }
}

export async function getCF({ key }: { key: string }) {
  try {
    const res = await fetch(`${config.DB.URI}${key}`)
    if (res.ok) {
      const data = await res.arrayBuffer()
      return unpack(new Uint8Array(data))
    } else {
      return null
    }
  } catch (e: any) {
    return error({ message: e?.message, data: e })
  }
}
