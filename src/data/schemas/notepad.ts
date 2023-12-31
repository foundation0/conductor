import { z } from "zod"
import { validateBinary } from "./binary"
import { nanoid } from "nanoid"

export const ClipS = z.object({
  _v: z.number().default(1),
  id: z
    .string()
    .min(1)
    .catch(() => nanoid(10)),
  type: z.string(),
  msg_id: z.string(),
  data_id: z.string().optional(),
  data: z.any().optional(),
  bin: z.custom((data) => validateBinary(data)).optional(),
})
export type ClipT = z.infer<typeof ClipS>

export const NotepadS = z.object({
  _v: z.number().default(1),
  _updated: z.number().optional(),
  session_id: z.string(),
  clips: z.array(ClipS),
})
export type NotepadT = z.infer<typeof NotepadS>

// export const NotepadsWithUpdateS = NotepadS.extend({ _updated: z.number().optional() })
export const NotepadsS = z.record(z.union([NotepadS, z.any()]))
