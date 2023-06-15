import { nanoid } from "nanoid"
import { z } from "zod"

export const TextMessageS = z.object({
  _v: z.number().default(1),
  id: z
    .string()
    .nonempty()
    .catch(() => nanoid(8)),
  version: z.literal("1.0").catch("1.0"),
  type: z.enum(["human", "ai", "system"]),
  text: z.string().nonempty(),
  source: z.string().nonempty(),
  active: z.boolean().optional(),
  parent_id: z.string().catch("first"),
  signature: z.string().optional(), // optional for now
  hash: z.string().optional(), // optional for now
})

export const ChatS = z.object({
  _v: z.number().default(1),
  id: z.string().nonempty(),
  type: z
    .string()
    .nonempty()
    .catch(() => "chat"),
  created_at: z.date().catch(() => new Date()),
  settings: z.object({
    module: z.object({
      id: z.string(),
      variant: z.string(),
    }),
  }),
  messages: z.array(TextMessageS),
})

export const SessionsS = z.object({
  _v: z.number().default(1),
  active: z.record(ChatS),
})
