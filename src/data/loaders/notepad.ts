import { store } from "@/data/storage/IDB"
import { NotepadsS } from "@/data/schemas/notepad"
import * as z from "zod"
import { getActiveUser } from "@/libraries/active_user"

export type NotepadsT = z.infer<typeof NotepadsS>

let cache: NotepadsT | null = null

export const state = async () => {
  if (!cache) {
    return (cache = (await store<NotepadsT>({
      name: "notepads",
      initial: async (): Promise<NotepadsT | null> => {
        if (!getActiveUser()) return null
        return {}
      },
      ztype: NotepadsS,
    })) as NotepadsT | null)
  }
  return cache
}
