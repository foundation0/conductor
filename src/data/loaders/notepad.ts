import { store } from "@/data/storage/IDB"
import { NotepadsS } from "@/data/schemas/notepad"
import * as z from "zod"
import { getActiveUser } from "@/libraries/active_user"
import { createMemoryState } from "@/libraries/memory"

export type NotepadsT = z.infer<typeof NotepadsS>

let cache: any = null

export const state = async () => {
  if (!cache) {
    cache = (await store<NotepadsT>({
      name: "notepads",
      initial: async (): Promise<NotepadsT | null> => {
        if (!getActiveUser()) return null
        return {}
      },
      ztype: NotepadsS,
    }))
    createMemoryState({ id: "notepads", state: await cache?.get() })

  }
  return cache
}
