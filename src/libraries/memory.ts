import { proxy } from "valtio"

const STATES: { [key: string]: any } = {}

export function getMemoryState<T>({ id }: { id: string }) {
  if (!STATES[id]) return false
  return STATES[id] as T
}

export function createMemoryState({ id, state, fail_on_create }: { id: string; state: any, fail_on_create?: boolean }) {
  if (!STATES[id] && fail_on_create) return false
  if (STATES[id]) return STATES[id]
  STATES[id] = proxy(state)
  return STATES[id]
}

export function destroyMemoryState({ id }: { id: string }) {
  if (!STATES[id]) return false
  delete STATES[id]
  return true
}

