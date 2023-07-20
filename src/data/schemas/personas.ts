import { z } from "zod"
import { nanoid } from "nanoid"
import _ from "lodash"

export const AssociatedDatS = z.object({
  _v: z.literal(1),
  id: z.string(),
  type: z.string().default('text'),
  active: z.boolean().optional(),
})

export const PersonaModuleS = z.object({
  _v: z.literal(1),
  id: z.string(),
  variant_id: z.string().optional(),
  settings: z.record(z.any()).optional(),
})

export const PersonaV1S = z.object({
  _v: z.literal(1),
  id: z.string().nonempty().catch(() => nanoid(10)),
  author: z.string().nonempty(),
  type: z.enum(['text']).default('text'),
  default_module: PersonaModuleS,
  associated_data: z.array(AssociatedDatS).optional(),
  meta: z.object({
    name: z.string(),
    avatar: z.string().optional(),
    author: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
  persona: z.object({
    name: z.string(),
    description: z.string(),
    background: z.string().optional(),
    style: z.array(z.string()).optional(),
    audience: z.string().optional(),
    responsibilities: z.array(z.string()).optional(),
    response_examples: z.array(z.string()).optional(),
    limitations: z.array(z.string()).optional(),
    traits: z.array(z.string()).optional(),
  }),
})

export const PersonaS = z.discriminatedUnion("_v", [
  PersonaV1S
])