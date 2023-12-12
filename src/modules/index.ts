import { z } from "zod"
import { LLMVariantT, ModuleS, StreamingT } from "@/data/schemas/modules"
import { initLoaders } from "@/data/loaders"
import { UserT } from "@/data/loaders/user"
import _ from "lodash"

import * as ULE from "@/modules/ule"
// import * as Automatic1111 from "@/modules/automatic1111"

import { error } from "@/libraries/logging"
import { emit } from "@/libraries/events"
import { createMemoryState } from "@/libraries/memory"
import { get as getLS } from "@/data/storage/localStorage"
import { fetchWithTimeout } from "@/libraries/utilities"

export const MODULES: any = {
  ule: ULE,
  // automatic1111: Automatic1111,
}

const CACHE: {
  [key: string]: {
    created_at: number
    value: any
  }
} = {}

let updated_mods: [] = []
try {
  if (navigator.onLine) {
    updated_mods = (await fetchWithTimeout(
      `https://services.foundation0.net/models.json`,
      { timeout: 15000 },
    )) as []
  }
} catch (error) {}
if (updated_mods.length === 0) {
  const models_cache = await getLS({ key: "cache.models.json" })
  if (models_cache) updated_mods = models_cache
}
const mem_modules: { modules: [] } = createMemoryState({
  id: "modules",
  state: { modules: updated_mods },
})
mem_modules.modules = updated_mods

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
    const installed_module = user_state.modules.installed.find(
      (m) => m.id === mod,
    )
    if (installed_module) {
      let latest_ule_models: LLMVariantT[] = []
      // if installed_module is ULE, fetch updated info
      if (installed_module.id === "ule") {
        const cached_ule_models = CACHE[installed_module.id]
        if (!updated_mods) {
          updated_mods = await (
            await fetch(`https://services.foundation0.net/models.json`)
          ).json()
          mem_modules.modules = updated_mods
        }
        if (
          !cached_ule_models ||
          (cached_ule_models?.created_at || 0) < Date.now() - 1000 * 60 * 5
        ) {
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
              const existing_settings = _.find(installed_module.meta.variants, {
                id: model.id,
              })?.settings
              return {
                id: model.id,
                name: `${vendor.meta.name} ${model.name}`,
                type: "language",
                context_len: model.context_len,
                settings: existing_settings || {
                  max_tokens: 2000,
                  temperature: 0,
                  top_p: 0.8,
                  top_k: 0.8,
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
        mm.specs.meta.variants = _(latest_ule_models)
          .uniqBy("id")
          .sortBy("id")
          .value()

        mm.specs.active = installed_module.active
        mm.specs.settings = {
          ...mm.specs.settings,
          ...installed_module.settings,
        }
        // mm.specs.meta.variants = _.uniqBy(installed_module.meta.variants, "id")
      }
      emit({
        type: "modules/update",
      })
    }
  }
  return mm as {
    specs: z.infer<typeof ModuleS>
    main: (
      input: z.infer<typeof m.InputS>,
      callbacks: StreamingT,
    ) => Promise<z.infer<typeof m.OutputS>>
  }
}

export const ModuleList = () => {
  return Object.entries(MODULES).map(([name, m]: any) => ({
    name,
    specs: m.specs,
  }))
}

export const getModules = async ({
  factory_state = false,
}: { factory_state?: boolean } = {}) => {
  const modules = ModuleList()
  const mods = await Promise.all(
    modules.map(async (module) => {
      const m = await Module(module.specs.id, factory_state)
      return m ? m?.specs : null
    }),
  )
  return _.compact(mods)
}
