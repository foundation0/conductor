import { store } from "@/data/storage/IDB"
import { UserS } from "@/data/schemas/user"
import * as z from "zod"
import { getActiveUser } from "@/libraries/active_user"

export type UserT = z.infer<typeof UserS>

let cache: UserT | null = null

export const state = async () => {
  if (!cache) {
    return (cache = (await store<UserT>({
      name: "user",
      initial: async (): Promise<UserT | null> => {
        if (!getActiveUser()) return null
        return getActiveUser()
      },
      ztype: UserS,
    })) as UserT | null)
  }
  return cache
}
