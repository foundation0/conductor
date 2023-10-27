import { store } from "@/data/storage/IDB"
import { DataT, DataS } from "@/data/schemas/data"

let cache: { [key: string]: DataT | null } = {}

export const state = async ({ id }: { id: string }) => {
  if (!cache[id]) {
    return (cache[id] = (await store<DataT>({
      name: `data:${id}`,
      initial: (): DataT | null => {
        return null
      },
      ztype: DataS,
    })) as DataT | null)
  }
  return cache[id]
}
