import config from "@/config"
import { error, info } from "./logging"
import { unpack } from "msgpackr"
import { buf2hex, createHash } from "@/security/common"
import pDebounce from "p-debounce"
import { get as getLS, set as setLS } from "@/data/storage/localStorage"

export function keyHash(str: string) {
  return buf2hex({ input: createHash({ str }) })
}

type SetT = { key: string; value: Uint8Array | Buffer }

const setters = new Map()
export function set({ key, value }: SetT) {
  const last_size = getLS({ key: `${key}-last_size` }) || 0
  const current_size = value.byteLength
  if (last_size === current_size) {
    info({ message: `skipping CF setter for ${key}` })
    return Promise.resolve(true)
  }
  const guest_mode = false // getLS({ key: "guest-mode" })
  if (!guest_mode && !setters.has(key)) {
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
    return guest_mode ? setLS({ key, value }) : setters.get(key)({ key, value })
  }
}

const getters = new Map()
export function get({ key }: { key: string }) {
  // const guest_mode = getLS({ key: "guest-mode" })
  const guest_mode = false
  if (!guest_mode && !getters.has(key)) {
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
    if (guest_mode) {
      return getLS({ key }) || null
    }
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
      setLS({ key: `${key}-last_size`, value: value.byteLength})
      const data = await res.text()
      return data
    } else {
      return null
    }
  } catch (e: any) {
    return error({ message: e?.message, data: e, notification: false })
  }
}

export async function getCF({ key }: { key: string }) {
  try {
    const res = await fetch(`${config.DB.URI}${key}`)
    if (res.ok) {
      const data = await res.arrayBuffer()
      try {
        const unpacked = unpack(new Uint8Array(data))
        setLS({ key: `${key}-last_checked`, value: new Date().getTime()})
        return unpacked
      } catch (err: any) {
        return error({ message: err?.message, data: err })
      }
    } else {
      return null
    }
  } catch (e: any) {
    return error({ message: e?.message, data: e, notification: false })
  }
}
