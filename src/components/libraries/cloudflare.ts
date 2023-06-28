import config from "@/config"
import { error } from "./logging"
import { unpack } from "msgpackr"

export async function set({ value, key }: { value: Uint8Array | Buffer; key: string }) {
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

export async function get({ key }: { key: string }) {
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
