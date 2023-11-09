import { initLoaders } from "@/data/loaders"
import { ClipS, NotepadS } from "@/data/schemas/notepad"
import _ from "lodash"
import { nanoid } from "nanoid"
import { z } from "zod"
import { emit, listen, query } from "@/libraries/events"
import { ph } from "@/libraries/logging"
import dayjs from "dayjs"

const API: { [key: string]: Function } = {
  add: async ({ session_id, msg_id, type, data }: { session_id: string; msg_id: string; type: string; data: any }) => {
    const { NotepadState } = await initLoaders()
    const notepads = _.cloneDeep(NotepadState.get())
    const clip: z.infer<typeof ClipS> = {
      _v: 1,
      id: nanoid(10),
      type,
      data,
      msg_id,
    }
    if (ClipS.safeParse(clip).success !== true) throw new Error("Invalid clip")
    notepads[session_id] = notepads[session_id] || { session_id, clips: [] }
    notepads[session_id].clips.push(clip)
    ph().capture("notepad/add")
    emit({
      type: "notepad.addClip.done",
      data: {
        notepad: notepads[session_id],
        target: session_id,
      },
    })
    await NotepadState.set(notepads)
  },
  updateNotepad: async ({ session_id, notepad }: { session_id: string; notepad: z.infer<typeof NotepadS> }) => {
    const { NotepadState } = await initLoaders()
    const notepads = _.cloneDeep(NotepadState.get())
    notepads[session_id] = notepad
    await NotepadState.set(notepads)
    emit({
      type: "notepad.updateNotepad.done",
      data: {
        notepad: notepads[session_id],
        target: session_id,
      },
    })
  },
  deleteClip: async ({ session_id, clip_id }: { session_id: string; clip_id: string }) => {
    const { NotepadState } = await initLoaders()
    const notepads = _.cloneDeep(NotepadState.get())
    notepads[session_id].clips = notepads[session_id].clips.filter((clip: any) => clip.id !== clip_id)
    await NotepadState.set(notepads)
    emit({
      type: "notepad.deleteClip.done",
      data: {
        notepad: notepads[session_id],
        target: session_id,
      },
    })
  },
}

listen({
  type: "notepad.*",
  action: async (data: any, e: any) => {
    const { callback } = data
    const method: string = e?.event?.replace("notepad.", "")
    if (method in API) {
      const response = await API[method](data)
      callback(response)
    } else {
      callback({ error: "method not found", data: { ...data, e } })
    }
  },
})

export default API
