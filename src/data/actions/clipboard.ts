import { initLoaders } from "@/data/loaders"
import { ClipS } from "@/data/schemas/clipboard"
import _ from "lodash"
import { nanoid } from "nanoid"
import { z } from "zod"

const API = {
  add: async ({ session_id, msg_id, type, data }: { session_id: string; msg_id: string; type: string; data: any }) => {
    const { ClipboardState } = await initLoaders()
    const clipboards = _.cloneDeep(ClipboardState.get())
    const clip: z.infer<typeof ClipS> = {
      _v: 1,
      id: nanoid(10),
      type,
      data,
      msg_id,
    }
    if (ClipS.safeParse(clip).success !== true) throw new Error("Invalid clip")
    clipboards[session_id] = clipboards[session_id] || { session_id, clips: [] }
    clipboards[session_id].clips.push(clip)
    await ClipboardState.set(clipboards)
  },
}

export default API
