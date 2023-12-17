import { store } from "@/data/storage/IDB"
import { VIndexT, VIndexS } from "@/data/schemas/data"

export const state = async ({ id }: { id: string }) =>
  await store<VIndexT>({
    name: `vindex:${id}`,
    initial: (): VIndexT | null => {
      return null
    },
    ztype: VIndexS,
  })
