import { useProxy } from "valtio/utils"
import { createMemoryState } from "@/libraries/memory"

export default function useMemory<T>({ id, state, fail_on_create }: { id: string; state?: { [key: string]: any }, fail_on_create?: boolean }): T {
  let _state = createMemoryState({ id, state, fail_on_create })
  if (!_state && !state) return null as T
  else if (_state) return useProxy(_state)
  return null as T
}
