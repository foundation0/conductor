import { useProxy } from "valtio/utils"
import { createMemoryState, getMemoryState } from "@/libraries/memory"

export default function useMemory<T>({ id, state }: { id: string; state?: { [key: string]: any } }): T {
  let _state = getMemoryState({ id })
  if (!_state && state) _state = createMemoryState({ id, state })
  else if (!_state && !state) return null as T
  return useProxy(_state)
}
