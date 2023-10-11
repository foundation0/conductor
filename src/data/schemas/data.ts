import { z } from "zod"
import { nanoid } from "nanoid"
import { generateSchemaTransformer } from "@/libraries/utilities"

export const DataS = generateSchemaTransformer({
  schemas: [z.object({
  _v: z.number().default(1),
  id: z.string().nonempty().catch(() => nanoid(10)),
})]})

export const DocumentS = generateSchemaTransformer({
  schemas: [z.object({
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
})]})

export const DataTypeS = generateSchemaTransformer({
  schemas: [z.object({
  _v: z.literal(1),
  type: z.string()
})]})