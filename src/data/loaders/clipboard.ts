import { store } from "@/data/storage/IDB"
import { ClipboardsS } from "@/data/schemas/clipboard"
import * as z from "zod"
import { getActiveUser } from "@/components/libraries/active_user"

export type ClipboardsT = z.infer<typeof ClipboardsS>

export const state = async () => await store<ClipboardsT>({
  name: "clipboards",
  initial: (): ClipboardsT | null => {
    return {}
  },
  ztype: ClipboardsS,
})
