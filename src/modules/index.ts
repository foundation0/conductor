import { z } from "zod"
import { ModuleS, StreamingT } from "@/data/schemas/modules"
import { initLoaders } from "@/data/loaders"
import { UserT } from "@/data/loaders/user"
import _ from "lodash";

// import built-in
import * as OpenAI from "@/modules/openai/"
import * as OpenAICostEstimator from "@/modules/openai-cost-estimator"
// import * as CPULLM from "@/modules/cpu-llm"
import { error } from "@/components/libraries/logging"

export const MODULES: any = {
  openai: OpenAI,
  "openai-cost-estimator": OpenAICostEstimator,
  // "cpu-llm": CPULLM,
}

export const Module = async (mod: string) => {
  if (!mod) return null
  const m = MODULES[mod]
  if (!m) throw new Error(`Module ${mod} not found`)
  const { UserState } = await initLoaders()
  const user_state = await UserState.get() as UserT
  // find the module in the user's installed modules
  const installed_module = user_state.modules.installed.find((m) => m.id === mod)
  if(installed_module) {
    // merge user's variants with module's variants, make sure there is no duplicate
    if (installed_module) {
      // merge user's variants with module's variants, make sure there is no duplicate
      m.specs.meta.variants = _.uniqBy(
        [
          ...m.specs.meta.variants,
          ...(installed_module.meta.variants || []),
        ],
        "id"
      );
    }
  }
  if (!m) return error({ message: `Module ${mod} not found` })
  return m as {
    specs: z.infer<typeof ModuleS>
    main: (input: z.infer<typeof m.InputS>, callbacks: StreamingT) => Promise<z.infer<typeof m.OutputS>>
  }
}

export const ModuleList = () => {
  return Object.entries(MODULES).map(([name, m] : any) => ({
    name,
    specs: m.specs,
  }))
}