import { z } from "zod"

export const LLMVariantS = z.object({
  id: z.string(),
  context_len: z.number().optional(),
  cost_input: z.number().optional(),
  cost_output: z.number().optional(),
  cost: z.number().optional().describe("deprecated"), // deprecated
})

export const ModuleS = z.object({
  _v: z.number().default(1),
  _updated: z.number().optional(),
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
    variants: z.array(LLMVariantS).optional(),
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
  setGenController: z.any(),
  onData: z.function().args(z.object({ data: z.any() })),
  onClose: z.function().args(z.object({ reason: z.enum(["close", "error", "end"]).default("end") })),
  onError: z.function(),
})
export type StreamingT = {
  onData: (data: any) => void
  onClose: (reason: "close" | "error" | "end") => void
  onError: (error: string, data?: any) => void
}
