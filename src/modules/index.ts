import { z } from "zod"
import { LLMVariantT, ModuleS, StreamingT } from "@/data/schemas/modules"
import { initLoaders } from "@/data/loaders"
import { UserT } from "@/data/loaders/user"
import _ from "lodash"

// import built-in
// import * as OpenAI from "@/modules/openai/"
// import * as OpenAICostEstimator from "@/modules/openai-cost-estimator"
// import * as CPULLM from "@/modules/cpu-llm"
import * as ULE from "@/modules/ule"
import { PEClient, PEClientNS } from "@/libraries/pe"

import { error } from "@/libraries/logging"
import config from "@/config"
import { emit } from "@/libraries/events"

export const MODULES: any = {
  // openai: OpenAI,
  // "openai-cost-estimator": OpenAICostEstimator,
  // "cpu-llm": CPULLM,
  ule: ULE,
}

const CACHE: {
  [key: string]: {
    created_at: number
    value: any
  }
} = {}

export const Module = async (mod: string, factory_state: boolean = false) => {
  if (!mod) return null
  const m = MODULES[mod]
  if (!m) {
    error({ message: `Module ${mod} not found, switching to default module` })
    return false
  }

  const mm = {
    specs: _.cloneDeep(m.specs),
    main: m.main,
  }
  const { UserState } = await initLoaders()
  const user_state = (await UserState.get()) as UserT

  if (!factory_state) {
    // find the module in the user's installed modules
    const installed_module = user_state.modules.installed.find((m) => m.id === mod)
    if (installed_module) {
      let latest_ule_models: LLMVariantT[] = []
      // if installed_module is ULE, fetch updated info
      if (installed_module.id === "ule") {
        const cached_ule_models = CACHE[installed_module.id]
        if (!cached_ule_models || (cached_ule_models?.created_at || 0) < Date.now() - 1000 * 60 * 5) {
          let updated_mods = await new Promise(async (resolve) => {
            let output: any = []
            const ULE = await PEClient({
              host: `${config.services.ule_URI}/PE`,
              onData: (data) => {
                output = [...output, ...data]
              },
              onDone: (data) => {
                resolve(output)
              },
              onError: (err) => {
                const error = {
                  code: err.code || "unknown",
                  message: err.error || err.message || err || "unknown",
                  status: "error",
                  surpress: false,
                }
                if (error.message === "canceled") return resolve(output)
              },
            })
            ULE.compute({
              type: "GetPricing",
              user_id: user_state.id,
            })
          })

          CACHE[installed_module.id] = {
            created_at: Date.now(),
            value: updated_mods,
          }
        }
        // merge module's variants with downloaded ule models

        // go through each model vendor
        latest_ule_models = _(CACHE[installed_module.id].value)
          .map((vendor: any) => {
            return vendor.models.map((model: any) => {
              const existing_settings = _.find(installed_module.meta.variants, { id: model.id })?.settings
              return {
                id: model.id,
                name: `${vendor.meta.name} ${model.name}`,
                type: "language",
                context_len: model.context_len,
                settings: existing_settings || {
                  max_tokens: 2000,
                  temperature: 0.8,
                  top_p: 1,
                  frequency_penalty: 0,
                  presence_penalty: 0,
                },
              }
            })
          })
          .flatten()
          .orderBy("name", "asc")
          .value()
      }

      // merge user's variants with module's variants, make sure there is no duplicate
      if (typeof mm.specs.meta?.variants === "object") {
        mm.specs.meta.variants = _(latest_ule_models).uniqBy("id").sortBy("id").value()

        mm.specs.active = installed_module.active
        mm.specs.settings = { ...mm.specs.settings, ...installed_module.settings }
        // mm.specs.meta.variants = _.uniqBy(installed_module.meta.variants, "id")
      }
      emit({
        type: "modules/update",
      })
    }
  }
  return mm as {
    specs: z.infer<typeof ModuleS>
    main: (input: z.infer<typeof m.InputS>, callbacks: StreamingT) => Promise<z.infer<typeof m.OutputS>>
  }
}

export const ModuleList = () => {
  return Object.entries(MODULES).map(([name, m]: any) => ({
    name,
    specs: m.specs,
  }))
}

export const getModules = async ({ factory_state = false }: { factory_state?: boolean } = {}) => {
  const modules = ModuleList()
  const mods = await Promise.all(
    modules.map(async (module) => {
      const m = await Module(module.specs.id, factory_state)
      return m ? m?.specs : null
    })
  )
  return _.compact(mods)
}
