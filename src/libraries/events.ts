import { nanoid } from "nanoid"
import EventEmitter from "fancy-events"
import { info } from "./logging"

const eventEmitter = new EventEmitter()

export default eventEmitter

export async function emit({
  type,
  data,
}: {
  type: string | string[]
  data?: any
}) {
  info({ message: "emit", data: { type, data } })
  if (Array.isArray(type)) {
    for (const t of type) {
      eventEmitter.emit(t, data)
    }
    return
  }
  eventEmitter.emit(type, data)
}

export function listen({
  type,
  action,
  once,
}: {
  type: string | string[]
  action: any
  once?: boolean
}): () => void {
  info({ message: "listen", data: { type, action } })
  if (Array.isArray(type)) {
    const listeners: any = []
    for (const t of type) {
      if (once) eventEmitter.once(t, (e: any, data: any) => action(data, e))
      else eventEmitter.on(t, (e: any, data: any) => action(data, e))
      listeners.push([t, action])
    }
    return () => {
      listeners.forEach((l: any) => eventEmitter.off(l[0], l[1]))
    }
  }
  if (once) eventEmitter.once(type, (e: any, data: any) => action(data, e))
  else eventEmitter.on(type, (e: any, data: any) => action(data, e))
  return () => {
    eventEmitter.off(type, (e: any, data: any) => action(data, e))
  }
}

const debounce_timers: any = {}

export async function query<T>({
  type,
  data,
}: {
  type: string | string[]
  data?: any
  callback?: Function
}): Promise<T> {
  // create unique id
  const uid = nanoid(10)

  return new Promise((resolve, reject) => {
    const stop_listener = listen({
      type: uid,
      action: (data: any) => {
        info({ message: `query/${uid}/response`, data: { type: uid, data } })
        resolve(data)
        return stop_listener()
      },
      once: true,
    })
    debounce_timers[JSON.stringify(type)] = setTimeout(async () => {
      // create listener
      emit({
        type,
        data: {
          ...data,
          callback: (data: any) => {
            info({ message: `query/${uid}/emit`, data: { type, data } })
            emit({
              type: uid,
              data,
            })
          },
        },
      })
    }, 10)
  })
}
