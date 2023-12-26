import { z } from "zod"
import { LLMVariantS, ModuleT } from "./modules"
import { SessionsT, TextMessageT, MessageRowT, ChatSessionT } from "./sessions"
import { DataRefT } from "./workspace"
import { AppStateT } from "../loaders/app"
import { AIT, AIsT } from "./ai"

export type mAppT = { workspace_id: string; session_id: string, state: AppStateT }
export type mBalancesT = {
  credits: number
  bytes: number
  status: "active" | "inactive" | "suspended" | "no_wallet"
}
export type mChatSessionT = {
  id: string
  module: { specs: ModuleT; main: Function } | undefined
  module_ctx_len: number
  ai: AIT,
  session: ChatSessionT
  attached_data: DataRefT[]
  input: { change_timer: any; text: string; tokens: number }
  context: { data_refs: DataRefT[]; tokens: number }
  messages: {
    raw: TextMessageT[]
    active: MessageRowT[]
    tokens: number
    branch_msg_id: string
    branch_parent_id: string | boolean
    empty_local?: boolean
  }
  generation: {
    in_progress: boolean
    controller: AbortController | undefined
    msgs_in_mem: string[]
    msg_update_ts: number
  }
}
export const ModelS = z.object({
  meta: z.object({
    id: z.string(),
    name: z.string(),
    active: z.boolean(),
    type: z.enum(["api", "server"]),
  }),
  models: z.array(LLMVariantS),
})
export type ModelT = z.infer<typeof ModelS>
export type mModulesT = { modules: ModelT[] }

export type mPricesT = {
  prices: {
    id: string
    type: string
    vendor: string
    module: string
    input_price: string
    output_price: string
  }[]
}

export type mAISelectorT = {
  show_settings: boolean
  active_llm_module_text: string
  ai_options: []
  llm_options: []
  session: ChatSessionT
  context_len: number
}
