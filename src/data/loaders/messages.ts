import { store } from "@/data/storage/IDB"
import { TextMessageS } from "@/data/schemas/sessions"
import * as z from "zod"
export type TextMessageT = z.infer<typeof TextMessageS>

let cache: { [key: string]: TextMessageT[] | null } = {}

export const state = async ({ session_id }: { session_id: string }) => {
  if (!cache[session_id]) {
    return (cache[session_id] = (await store<TextMessageT[]>({
      name: session_id,
      initial: (): TextMessageT[] => {
        return []
      },
      ztype: z.array(TextMessageS),
    })) as TextMessageT[] | null)
  }
  return cache[session_id]
}
