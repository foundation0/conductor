import { initLoaders } from "@/data/loaders"
import _ from "lodash"
import eventEmitter from "@/components/libraries/events"
import { error, ph } from "@/components/libraries/logging"
import { AIS, AIT } from "../schemas/ai"
import { getId } from "@/security/common"
import { getActiveUser } from "@/components/libraries/active_user"
import UserActions from "@/data/actions/user"
import { UserT } from "../loaders/user"

const API = {
  add: async ({ persona, default_llm_module }: Partial<AIT>) => {
    if (!persona) return error({ message: "Persona is required" })
    if (!default_llm_module) return error({ message: "Default LLM Module is required" })

    const { UserState } = await initLoaders()
    const user_state: UserT = await UserState.get()
    if (!user_state) return error({ message: "User is required" })

    const { AIState } = await initLoaders()
    const ais = _.cloneDeep(AIState.get())

    // check for duplicate name
    const same_name_ai = ais.find((ai: AIT) => ai.meta.name === persona["name"])

    if (same_name_ai) {
      const already_installed_ai = user_state.ais?.find((user_ai) => user_ai.id === ai.id)
      // if same name ai exists and is already installed, return error
      if (same_name_ai && already_installed_ai) return error({ message: "You already have this AI." })
    }

    const ai: AIT = {
      _v: 1,
      id: getId(),
      status: "draft",
      default_llm_module,
      meta: {
        author: user_state.id,
        type: "text",
        name: persona["name"],
        description: persona["description"],
      },
      persona,
    }
    if (AIS.safeParse(ai).success !== true) return error({ message: "Invalid AI" })

    // add ai to the list if it doesn't exist
    if (!same_name_ai) {
      ais.push(ai)
      await AIState.set(ais)
    }

    // add ai to user
    const u = { ...user_state, ais: user_state.ais || [] }
    u.ais?.push({
      id: same_name_ai?.id || ai.id,
      status: "active",
    })

    await UserActions.updateUser(u)

    eventEmitter.emit("ai_added")
    ph().capture("ai/added")

    return ai
  },


  update: async ({ ai }: { ai: Partial<AIT> }) => {
    const { AIState } = await initLoaders()
    const ais = _.cloneDeep(AIState.get())
    const index = ais.findIndex((a: AIT) => a.id === ai.id)
    if (index === -1) return error({ message: "AI not found" })
    ais[index] = { ...ais[index], ...ai }
    await AIState.set(ais, null, true)
  },

  fork: async ({ ai_id }: { ai_id: string }) => {
    const { AIState } = await initLoaders()
    const ais = _.cloneDeep(AIState.get())
    const index = ais.findIndex((a: AIT) => a.id === ai_id)
    if (index === -1) return error({ message: "AI not found" })
    const ai = ais[index]
    const forked_ai: AIT = {
      ...ai,
      id: getId(),
      status: "fork",
      meta: {
        ...ai.meta,
        name: `${ai.meta.name} (copy)`,
      },
    }
    ais.push(forked_ai)
    await AIState.set(ais)
  },

  delete: async ({ ai_id }: { ai_id: string }) => {
    const { AIState } = await initLoaders()
    const ais = _.cloneDeep(AIState.get())
    const index = ais.findIndex((a: AIT) => a.id === ai_id)
    if (index === -1) return error({ message: "AI not found" })
    ais.splice(index, 1)
    await AIState.set(ais, null, true)
  },
}

export default API
