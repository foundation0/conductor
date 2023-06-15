import { z } from "zod"
import { ModuleS, StreamingT } from "@/data/schemas/modules"

// import built-in
import * as OpenAI from "@/modules/openai/"

const MODULES: any = {
  openai: OpenAI,
}

export const Module = (mod: string) => {
  if (!mod) return null
  const m = MODULES[mod]
  if (!m) throw new Error(`Module ${mod} not found`)
  return m as {
    specs: z.infer<typeof ModuleS>
    main: (input: z.infer<typeof m.InputS>, callbacks: StreamingT) => Promise<z.infer<typeof m.OutputS>>
  }
}
