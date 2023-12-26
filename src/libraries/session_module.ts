import { AIsT } from "@/data/schemas/ai"
import { emit, query } from "./events"
import { error } from "./logging"
import { getMemoryState } from "./memory"
import { mAppT, mChatSessionT } from "@/data/schemas/memory"
import _ from "lodash"

export async function handleModuleChange({ value }: { value: string }) {
  const mem_app = getMemoryState<mAppT>({ id: "app" })
  if (!mem_app) return error({ message: "App not found" })
  const mem_session = getMemoryState<mChatSessionT>({
    id: `session-${mem_app.session_id}`,
  })
  if (!mem_session) return error({ message: "Session not found" })
  const { session } = mem_session

  const new_llm_module = value.split("/")
  if (!new_llm_module) return error({ message: "Module not found" })

  // update session default module
  mem_session.session.settings.module = {
    id: new_llm_module[0],
    variant: new_llm_module[1],
  }

  emit({
    type: "sessions.updateSessions",
    data: {
      active: {
        [session.id]: mem_session.session,
      },
    },
  })
  emit({
    type: "sessions/module-change",
    data: {
      target: session.id,
      module_id: new_llm_module[0],
      variant_id: new_llm_module[1],
    },
  })
}

export async function handleAIChange({ value }: { value: string }) {
  const ai_state: AIsT = await query({
    type: "ai.getAll",
  })
  const mem_app = getMemoryState<mAppT>({ id: "app" })
  if (!mem_app) return error({ message: "App not found" })
  const mem_session = getMemoryState<mChatSessionT>({
    id: `session-${mem_app.session_id}`,
  })
  if (!mem_session) return error({ message: "Session not found" })
  const { session } = mem_session

  // check that ai is installed
  const ai = _.find(ai_state, { id: value })
  if (!ai) return error({ message: "AI not found" })

  // update session default ai
  mem_session.session.settings.ai = ai.id
  mem_session.ai = ai

  // update session llm if not locked
  if (!session.settings.module.locked) {
    mem_session.session.settings.module = {
      id: ai.default_llm_module.id,
      variant: ai.default_llm_module.variant_id || "",
    }
  }

  emit({
    type: "sessions.updateSessions",
    data: {
      active: {
        [session.id]: mem_session.session,
      },
    },
  })

  emit({
    type: "sessions/module-change",
    data: {
      target: session.id,
      ai: value,
    },
  })
}
