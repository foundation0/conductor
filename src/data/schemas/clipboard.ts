import { z } from "zod"
import { validateBinary } from "./binary"
import { nanoid } from "nanoid"

export const ClipS = z.object({
  _v: z.number().default(1),
  id: z
    .string()
    .nonempty()
    .catch(() => nanoid(10)),
  type: z.string(),
  msg_id: z.string(),
  data: z.any().optional(),
  bin: z.custom((data) => validateBinary(data)).optional(),
})

export const ClipboardS = z.object({
  _v: z.number().default(1),
  session_id: z.string(),
  clips: z.array(ClipS),
})

export const ClipboardsS = z.record(ClipboardS)
