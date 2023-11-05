import { z } from "zod"
import _ from "lodash"
import { getId } from "@/security/common"

const AssociatedDatSs = [
  z.object({
    _v: z.literal(1),
    id: z.string(),
    type: z.string().default("text"),
    active: z.boolean().optional(),
  }),
]
export const AssociatedDatS = AssociatedDatSs[0]

export type AssociatedDat = z.infer<(typeof AssociatedDatSs)[0]>

const LLModulesSs = [
  z.object({
    _v: z.literal(1),
    id: z.string(),
    variant_id: z.string().optional(),
    settings: z.record(z.any()).optional(),
  }),
]

export const LLMModuleS = LLModulesSs[0]

export type LLMModuleT = z.infer<(typeof LLModulesSs)[0]>

const AISs = [
  z.object({
    _v: z.literal(1),
    id: z
      .string()
      .min(1)
      .catch(() => getId()),
    status: z.enum(["draft", "published", "fork"]).default("draft"),
    default_llm_module: LLMModuleS,
    associated_data: z.array(AssociatedDatS).optional(),
    meta: z.object({
      type: z.enum(["text"]).default("text"),
      name: z.string().min(1),
      author: z.string(),
      avatar: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
    persona: z.object({
      name: z.string().min(1),
      description: z.string().min(1),
      background: z.string().optional(),
      styles: z.array(z.string()).optional(),
      audience: z.string().optional(),
      responsibilities: z.array(z.string()).optional(),
      response_examples: z
        .array(
          z.object({
            message: z.string(),
            response: z.string(),
          }).optional()
        )
        .optional(),
      limitations: z.array(z.string()).optional(),
      traits: z.array(z.object({ skill: z.string(), value: z.number().min(-1).max(1) })).optional(),
    }),
  }),
]
export const AIS = AISs[0]

export type AIT = z.infer<(typeof AISs)[0]>
export type PersonaT = Pick<AIT, 'persona'>

export const AIsS = z.array(AISs[0])
export type AIsT = z.infer<typeof AIsS>