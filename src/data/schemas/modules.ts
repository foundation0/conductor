import { z } from "zod"
import { RangeS } from "./common"

export const LLMTemplateS = z.object({
  assistant_start: z.string().optional(),
  assistant_end: z.string().optional(),
  prompt_start: z.string().optional(),
  prompt_end: z.string().optional(),
  system: z.string().optional(),
  system_start: z.string().optional(),
  system_end: z.string().optional(),
  stop: z.array(z.string()).optional(),
})

export const ULES = z.object({
  tokenizer_type: z.enum(["module", "hf"]),
  tokenizer_name: z.string(),
  tokenizer_file_repo: z.string().optional(),
})

export const LLMVariantS = z.object({
  id: z.string(),
  name: z.string().optional(),
  type: z.enum(["language", "image", "audio", "video", "3D", "graph"]).default("language"),
  active: z
    .boolean()
    .optional()
    .catch(() => false),
  tokenizer: ULES.optional(),
  context_len: z.number().optional(),
  cost_input: z.number().optional(),
  cost_output: z.number().optional(),
  template: z.union([z.string(), LLMTemplateS]).optional(),
  settings: z.record(z.any()).optional(),
  color: z.string().default("transparent").optional(), // deprecated
  cost: z.number().optional().describe("deprecated"), // deprecated
})
export type LLMVariantT = z.infer<typeof LLMVariantS>

export const ModuleS = z.object({
  _v: z.number().default(1),
  _updated: z.number().optional(),
  id: z.string(),
  active: z
    .boolean()
    .optional()
    .catch(() => false),
  meta: z.object({
    author: z.string().catch(() => "0x000"),
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
  cost: z.number().optional().describe("deprecated"), // deprecated
  streaming: z
    .boolean()
    .catch(() => false)
    .optional()
    .describe("deprecated"), // deprecated
})
export type ModuleT = z.infer<typeof ModuleS>

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
  [key: string]: Function
}
