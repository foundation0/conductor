import { proxy } from "valtio"
import { useProxy } from "valtio/utils"

const STATES: { [key: string]: any } = {}

export default function useMemory<T>({ id, state }: { id: string; state: { [key: string]: any } }): T {
  if (!STATES[id]) STATES[id] = proxy({ ...state })
  return useProxy(STATES[id])
}
