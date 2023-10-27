import { EventEmitter } from "eventemitter3"

const eventEmitter = new EventEmitter()

export default eventEmitter

export async function emit({ type, data }: { type: string | string[]; data?: any }) {
  if (Array.isArray(type)) {
    for (const t of type) {
      eventEmitter.emit(t, data)
    }
    return
  }
  eventEmitter.emit(type, data)
}

export function listen({ type, action }: { type: string | string[]; action: any }): () => void {
  if (Array.isArray(type)) {
    const listeners: any = []
    for (const t of type) {
      eventEmitter.on(t, action)
      listeners.push([t, action])
    }
    return () => {
      listeners.forEach((l: any) => eventEmitter.off(l[0], l[1]))
    }
  }
  eventEmitter.on(type, action)
  return () => {
    eventEmitter.off(type, action)
  }
}
