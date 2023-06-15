import { z } from "zod"

export const ModuleS = z.object({
  _v: z.number().default(1),
  id: z.string(),
  meta: z.object({
    name: z.string(),
    type: z.string(),
    vendor: z.object({
      name: z.string(),
      url: z.string().url().optional(),
    }),
    description: z.string().optional(),
    icon: z.string().optional(),
    variants: z
      .array(
        z.object({
          id: z.string(),
          context_len: z.number().optional(),
          cost: z.number().optional(),
        })
      )
      .optional(),
  }),
  settings: z.record(z.any()).optional(),
  streaming: z.boolean().catch(() => false),
  cost: z.number().optional(),
})

const ModuleHooksS = z.object({
  before: z.array(z.function()).optional(),
  after: z.array(z.function()).optional(),
})

export const StreamingS = z.object({
  _v: z.number().default(1),
  onData: z.function().args(z.object({ data: z.any() })),
  onClose: z.function().args(z.object({ reason: z.enum(["close", "error", "end"]).default("end") })),
  onError: z.function().args(z.object({ error: z.string(), data: z.any().optional() })),
})
export type StreamingT = {
  onData: (data: any) => void
  onClose: (reason: "close" | "error" | "end") => void
  onError: (error: string, data?: any) => void
}
