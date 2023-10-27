import { store } from "@/data/storage/IDB"
import { VectorT, VectorS } from "@/data/schemas/data"

let cache: { [key: string]: VectorT | null } = {}

export const state = async ({ id }: { id: string }) => {
  if (!cache[id]) {
    return (cache[id] = (await store<VectorT>({
      name: `vectors:${id}`,
      local_only: true,
      initial: (): VectorT | null => {
        return null
      },
      ztype: VectorS,
    })) as VectorT | null)
  }
  return cache[id]
}
