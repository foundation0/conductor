import { store } from "@/data/storage/IDB"
import { DataT, DataS } from "@/data/schemas/data"
import { createMemoryState } from "@/libraries/memory"

let cache: { [key: string]: any } = {}

export const state = async ({ id }: { id: string }) => {
  if (!cache[id]) {
    cache[id] = (await store<DataT>({
      name: `data:${id}`,
      initial: (): DataT | null => {
        return null
      },
      ztype: DataS,
    }))
  }
  return cache[id]
}
