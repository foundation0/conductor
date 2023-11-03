import { nanoid } from "nanoid"
import { z } from "zod"
import { DataRefS } from "./workspace"

export const TextMessageS = z.object({
  _v: z.number().default(1),
  id: z
    .string()
    .nonempty()
    .catch(() => nanoid(8)),
  version: z.literal("1.0").catch("1.0"),
  created_at: z.string().catch(() => new Date().toUTCString()),
  type: z.enum(["human", "ai", "system"]),
  meta: z
    .object({
      role: z.enum(["msg", "continue", "regen", "temp"]).catch("msg"),
    })
    .optional(),
  text: z.string().nonempty(),
  context: z.string().optional(),
  active: z.boolean().optional(),
  source: z.string().min(1),
  parent_id: z.string().catch("first"),
  signature: z.string().optional(), // optional for now
  hash: z.string().optional(), // optional for now
})
export type TextMessageT = z.infer<typeof TextMessageS>

export type MessageRowT = [TextMessageT[], TextMessageT, TextMessageT[]]

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
export type CostT = z.infer<typeof CostS>

const ReceiptDetailsS = z.object({
  type: z.string().catch(() => "chat_message"),
  input: z.object({
    tokens: z.number(),
    cost_usd: z.number(),
  }),
  output: z.object({
    tokens: z.number(),
    cost_usd: z.number(),
  }),
})
export type ReceiptDetailsT = z.infer<typeof ReceiptDetailsS>

export const ReceiptS = z.object({
  receipt_id: z.string(),
  vendor: z.string(),
  model: z.string(),
  cost_usd: z.number(),
  details: ReceiptDetailsS,
})
export type ReceiptT = z.infer<typeof ReceiptS>

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
  receipts: z.array(ReceiptS).optional(),
  data: z.array(DataRefS).optional(),
  // deprecated
  ledger: z.array(CostS).optional().describe("deprecated"),
  messages: z.array(TextMessageS).optional().describe("deprecated"),
})
export type ChatT = z.infer<typeof ChatS>

export const SessionsS = z.object({
  _v: z.number().default(1),
  _updated: z.number().optional(),
  active: z.record(ChatS),
})
export type SessionsT = z.infer<typeof SessionsS>
