import { store } from "@/data/storage/IDB"
import { TextMessageS } from "@/data/schemas/sessions"
import * as z from "zod"
import { getActiveUser } from "@/components/libraries/active_user"

export type TextMessageT = z.infer<typeof TextMessageS>

export const state = async ({ session_id }: { session_id: string}) => await store<TextMessageT[]>({
  name: session_id,
  initial: (): TextMessageT[] => {
    return []
  },
  ztype: z.array(TextMessageS),
})
