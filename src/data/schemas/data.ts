import { z } from "zod"
import { nanoid } from "nanoid"

export const DataS = z.object({
  _v: z.number().default(1),
  id: z.string().nonempty().catch(() => nanoid(10)),
})

export const DocumentS = z.object({
  _v: z.literal(1),
  type: z.string().default('document'),
  meta: z.object({
    name: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  }),
  data: z.object({
    content: z.string(),
  }),
})

export const DataTypeS = z.object({
  _v: z.literal(1),
  type: z.string()
})