import { store } from "@/data/storage/localStorage"
import { ClipboardsS } from "@/data/schemas/clipboard"
import * as z from "zod"

export type ClipboardsT = z.infer<typeof ClipboardsS>

export const state = await store<ClipboardsT>({
  name: "clipboards",
  initial: (): ClipboardsT => {
    return {}
  },
  ztype: ClipboardsS,
})
