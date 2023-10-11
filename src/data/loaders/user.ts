import { store } from "@/data/storage/IDB"
import { UserS } from "@/data/schemas/user"
import * as z from "zod"
import { getActiveUser } from "@/libraries/active_user"

export type UserT = z.infer<typeof UserS>
export const state = async () => await store<UserT>({
  name: "user",
  initial: async (): Promise<UserT | null> => {
    if (!getActiveUser()) return null
    return getActiveUser()
  },
  ztype: UserS,
})
