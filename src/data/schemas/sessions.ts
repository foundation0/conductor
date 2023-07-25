import { nanoid } from "nanoid"
import { z } from "zod"

export const TextMessageS = z.object({
  _v: z.number().default(1),
  id: z
    .string()
    .nonempty()
    .catch(() => nanoid(8)),
  version: z.literal("1.0").catch("1.0"),
  created_at: z.string().catch(() => new Date().toUTCString()),
  type: z.enum(["human", "ai", "system"]),
  text: z.string().nonempty(),
  active: z.boolean().optional(),
  source: z.string().nonempty(),
  parent_id: z.string().catch("first"),
  signature: z.string().optional(), // optional for now
  hash: z.string().optional(), // optional for now
})

export const CostS = z.object({
  _v: z.number().default(1),
  created_at: z.date().catch(() => new Date()),
  msgs: z.array(z.string()).nonempty(),
  cost_usd: z.number().nonnegative(),
  tokens: z.number().nonnegative(),
  module: z.object({
    id: z.string(),
    variant: z.string().optional(),
  }),
})

export const ChatS = z.object({
  _v: z.number().default(1),
  _updated: z.number().optional(),
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
      locked: z.boolean().optional(),
    }),
    ai: z.string().optional(),
  }),
  ledger: z.array(CostS).optional(),
  // deprecated
  messages: z.array(TextMessageS).optional().describe("deprecated"),
})

export const SessionsS = z.object({
  _v: z.number().default(1),
  _updated: z.number().optional(),
  active: z.record(ChatS),
})
