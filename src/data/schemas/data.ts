import { z } from "zod"
import { nanoid } from "nanoid"
import { DataTypesTextS, DataTypesTextT, DataTypesBinaryS, DataTypesBinaryT } from "@/data/schemas/data_types"
import _ from "lodash"

export const EmbeddingModels = z.enum(["MiniLM-L6-v2"])
export type EmbeddingModelsT = z.infer<typeof EmbeddingModels>

export const VectorS = z.object({
  _v: z.number().default(1),
  data_id: z.string(),
  model: EmbeddingModels,
  locs: z.array(z.object({ start: z.number(), end: z.number(), id: z.string(), name: z.string() })),
  vectors: z.array(z.array(z.number())),
})
export type VectorT = z.infer<typeof VectorS>

export const IndexersS = z.enum(["voy"])
export type IndexersT = z.infer<typeof IndexersS>

export const VIndexS = z.object({
  _v: z.number().default(1),
  workspace_id: z.string(),
  data: z.discriminatedUnion("indexer", [
    z.object({
      indexer: IndexersS,
      index: z.string(),
    }),
  ]),
})
export type VIndexT = z.infer<typeof VIndexS>

export const TextS = z.object({
  mime: DataTypesTextS,
  content: z.string(),
})
export type TextT = z.infer<typeof TextS>

export const BinaryS = z.object({
  mime: DataTypesBinaryS,
  // array buffer
  content: z.any(),
})
export type BinaryT = z.infer<typeof BinaryS>

export const DataS = z.object({
  _v: z.number().default(1),
  id: z.string(),
  meta: z.object({
    name: z.string(),
    filename: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  }),
  data: z.discriminatedUnion("mime", [TextS, BinaryS]),
})
export type DataT = z.infer<typeof DataS>
