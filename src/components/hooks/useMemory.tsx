import { useProxy } from "valtio/utils"
import { createMemoryState } from "@/libraries/memory"

export default function useMemory<T>({ id, state }: { id: string; state?: { [key: string]: any } }): T {
  let _state = createMemoryState({ id, state })
  if (!_state && !state) return null as T
  else if (_state) return useProxy(_state)
  return null as T
}
