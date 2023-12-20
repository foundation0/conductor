import { initLoaders } from "@/data/loaders"
import { ClipS, NotepadS, NotepadT } from "@/data/schemas/notepad"
import _ from "lodash"
import { nanoid } from "nanoid"
import { z } from "zod"
import { emit, listen, query } from "@/libraries/events"
import { error, ph } from "@/libraries/logging"
import { NotepadsT } from "../loaders/notepad"
import { getMemoryState } from "@/libraries/memory"

const API: { [key: string]: Function } = {
  add: async ({
    session_id,
    msg_id,
    type,
    data,
  }: {
    session_id: string
    msg_id: string
    type: string
    data: any
  }) => {
    const { NotepadState } = await initLoaders()
    const notepads = _.cloneDeep(NotepadState.get())
    const clip: z.infer<typeof ClipS> = {
      _v: 1,
      id: nanoid(10),
      type,
      data,
      msg_id,
    }
    if (clip.msg_id === "0") clip.msg_id = `na/${clip.id}`
    if (ClipS.safeParse(clip).success !== true) throw new Error("Invalid clip")
    notepads[session_id] = notepads[session_id] || { session_id, clips: [] }
    notepads[session_id].clips.push(clip)

    // remove duplicates by msg_id
    notepads[session_id].clips = _(notepads[session_id].clips)
      .uniqBy("id")
      .value()
    await NotepadState.set(notepads, false, true)

    ph().capture("notepad/add")
    emit({
      type: "notepad.addClip.done",
      data: {
        notepad: notepads[session_id],
        target: session_id,
      },
    })
    return clip
  },
  updateNotepad: async ({
    session_id,
    notepad,
  }: {
    session_id: string
    notepad: z.infer<typeof NotepadS>
  }) => {
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
  updateClip: async ({
    session_id,
    clip,
  }: {
    session_id: string
    clip: z.infer<typeof ClipS>
  }) => {
    const { NotepadState } = await initLoaders()
    const notepads = _.cloneDeep(NotepadState.get())
    const index = _.findIndex(notepads[session_id].clips, { id: clip.id })
    if (index === -1) throw new Error("Clip not found")
    notepads[session_id].clips[index] = _.merge(
      notepads[session_id].clips[index],
      clip,
    )
    // parse
    if (ClipS.safeParse(notepads[session_id].clips[index]).success) {
      await NotepadState.set(notepads)
      emit({
        type: "notepad.updateClip.done",
        data: {
          notepad: notepads[session_id],
          target: session_id,
        },
      })
    } else {
      return error({ message: "invalid clip", data: { clip } })
    }
  },
  deleteClip: async ({
    session_id,
    clip_id,
  }: {
    session_id: string
    clip_id: string
  }) => {
    const { NotepadState } = await initLoaders()
    const notepads = _.cloneDeep(NotepadState.get())
    notepads[session_id].clips = _(notepads[session_id].clips)
      .uniqBy("msg_id")
      .uniqBy("id")
      .filter((clip: any) => clip.id !== clip_id)
      .value()
    await NotepadState.set(notepads, false, true)
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

listen({
  type: "store/update",
  action: async (data: any) => {
    const name = "notepads"
    if (data?.target === name) {
      const mem = getMemoryState<NotepadsT>({ id: name })
      if (mem && mem) _.assign(mem, data?.state)
    }
  },
})

export default API
