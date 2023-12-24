import config from "@/config"
import { error, info } from "./logging"
import { unpack } from "msgpackr"
import { buf2hex, createHash } from "@/security/common"
import pDebounce from "p-debounce"
import { get as getLS, set as setLS } from "@/data/storage/localStorage"

export function keyHash(str: string): string {
  return createHash({ str, format: 'hex' }) as string
}

type SetT = { key: string; value: Uint8Array | Buffer }

const setter_timers: any = {}

const setters = new Map()
export function set({ key, value }: SetT) {
  const last_hash = getLS({ key: `${key}-checksum` }) || 0
  const hash = createHash({ str: value, format: 'hex' })
  if (last_hash === hash) {
    info({ message: `skipping CF set because store hasn't changed` })
    return Promise.resolve(true)
  }
  // const guest_mode = false // getLS({ key: "guest-mode" })
  // if (!guest_mode && !setters.has(key)) {
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
    // return guest_mode ? setLS({ key, value }) : setters.get(key)({ key, value })
    return setters.get(key)({ key, value })
  }
}

const getters = new Map()
export function get({ key, checksum }: { key: string, checksum?: string }) {
  // const guest_mode = getLS({ key: "guest-mode" })
  // const guest_mode = false
  // if (!guest_mode && !getters.has(key)) {
  if (!getters.has(key)) {
    info({ message: `setting up CF getter for ${key}` })
    getters.set(
      key,
      pDebounce(async ({ key, checksum }: { key: string, checksum?: string }) => {
        const d = await getCF({ key, checksum })
        const hash = createHash({ str: d, format: 'hex' })
        setLS({ key: `${key}-checksum`, value: hash})
        return d
      }, config.DB.CF.get_limit)
    )
    return getCF({ key, checksum })
  } else {
    info({ message: `getting CF getter for ${key}` })
    // if (guest_mode) {
    //   return getLS({ key }) || null
    // }
    return getters.get(key)({ key, checksum })
  }
}

export async function setCF({ value, key }: SetT) {
  try {
    const res = await fetch(`${config.DB.URI}${key}`, {
      method: "POST",
      body: value,
    })
    if (res.ok) {
      const hash = createHash({ str: value, format: 'hex' })
      setLS({ key: `${key}-checksum`, value: hash})
      const data = await res.text()
      info({ message: `setCF ${key}`, data })
      return data
    } else {
      return null
    }
  } catch (e: any) {
    return error({ message: e?.message, data: e, notification: false })
  }
}

export async function getCF({ key, checksum }: { key: string, checksum?: string }) {
  try {
    const res = await fetch(`${config.DB.URI}${key}${checksum ? `/${checksum}` : ""}`)
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
