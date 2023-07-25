import { z } from "zod"

export const RangeS = z.object({
  min: z.number().default(0),
  max: z.number().default(1),
  value: z.number().default(0),
  step: z.number().default(0.01).optional(),
  label: z.string().optional(),
  unit: z.string().optional(),
})