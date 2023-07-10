import { store } from "@/data/storage/IDB"
import { NotepadsS } from "@/data/schemas/notepad"
import * as z from "zod"
import { getActiveUser } from "@/components/libraries/active_user"

export type NotepadsT = z.infer<typeof NotepadsS>

export const state = async () => await store<NotepadsT>({
  name: "notepads",
  initial: (): NotepadsT | null => {
    return {}
  },
  ztype: NotepadsS,
})
