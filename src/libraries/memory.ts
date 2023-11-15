import { proxy } from "valtio"

const STATES: { [key: string]: any } = {}

export function getMemoryState({ id }: { id: string }) {
  if (!STATES[id]) return false
  return STATES[id]
}

export function createMemoryState({ id, state }: { id: string; state: any }) {
  if (STATES[id]) return false
  STATES[id] = proxy(state)
  return STATES[id]
}

export function destroyMemoryState({ id }: { id: string }) {
  if (!STATES[id]) return false
  delete STATES[id]
  return true
}

