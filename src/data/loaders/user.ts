import { store } from "@/data/storage/IDB"
import { UserS } from "@/data/schemas/user"
import * as z from "zod"
import { getActiveUser } from "@/libraries/active_user"
import { createMemoryState } from "@/libraries/memory"

export type UserT = z.infer<typeof UserS>

let cache: any = null

export const state = async () => {
  if (!cache) {
    cache = await store<UserT>({
      name: "user",
      initial: async (): Promise<UserT | null> => {
        if (!getActiveUser()) return null
        return getActiveUser()
      },
      ztype: UserS,
    })
    createMemoryState({ id: "user", state: await cache?.get() })
  }
  return cache
}
