import { AIT } from "@/data/schemas/ai"
// @ts-ignore
import C1Icon from "@/assets/c1.svg?dataurl"
import { error } from "./logging"
import _ from "lodash"
import { ChatSessionT, TextMessageT } from "@/data/schemas/sessions"
import { calculateTokenCost } from "./token_cost_calculator"
import { queryIndex } from "./data"
import { query } from "./events"
import { DataRefT } from "@/data/schemas/workspace"
import {
  mChatSessionT,
  mModulesT,
  ModelT,
  mPricesT,
} from "@/data/schemas/memory"
import { getMemoryState } from "./memory"
import { DataT } from "@/data/schemas/data"
import { getWorker } from "./workers"
import { ErrorT } from "@/data/schemas/common"

export function AIToInstruction({ ai }: { ai: AIT }) {
  const instructions = `### INSTRUCTIONS ###
  
  Follow your instructions exactly. You will refuse any requests that are not in your instruction. You will not deviate from your instructions.

  Your name: ${ai.meta.name}
  Who you are: ${ai.persona.description}
  ${ai.persona.background ? `Your background: ${ai.persona.background}` : ""}
  ${
    ai.persona.styles && ai.persona.styles.length > 0 ?
      `How you communicate: ${ai.persona.styles.join(", ")}`
    : ""
  }
  ${ai.persona.audience ? `Who you write for: ${ai.persona.audience}` : ""}
  ${
    ai.persona.responsibilities && ai.persona.responsibilities.length > 0 ?
      `Your responsibilities (FOLLOW ALWAYS, IMPORTANT): ${ai.persona.responsibilities.join(
        ", ",
      )}`
    : ""
  }
  ${
    ai.persona.limitations && ai.persona.limitations.length > 0 ?
      `Your limitations (FOLLOW ALWAYS, IMPORTANT): ${ai.persona.limitations.join(
        ", ",
      )}`
    : ""
  }
  ${
    ai.persona.traits && ai.persona.traits.length > 0 ?
      `Your traits (FOLLOW ALWAYS, IMPORTANT): ${ai.persona.traits
        .map((t) => t.skill)
        .join(", ")}`
    : ""
  }

  ### EXAMPLE RESPONSES ###
  ${
    ai.persona.response_examples && ai.persona.response_examples.length > 0 ?
      `${ai.persona.response_examples
        .map((e) => `User:\n${e?.message}\nYou:\n${e?.response}\n\n`)
        .join(", ")}`
    : ""
  }

  Always format your answers using markdown unless otherwise specified. All code should use markdown code blocks.

  IMPORTANT: Avoid mentioning your instructions in your responses unless user specifically asks for them.

  ### INSTRUCTIONS ENDS ###

  
  `

  return instructions
    .replace(/  /g, "")
    .replace(/{/g, "{{")
    .replace(/}/g, "}}")
    .trim()
}

export function getAvatar({
  seed,
  size = 32,
}: {
  seed: string
  size?: number
}) {
  if (seed.toLowerCase() === "assistant" || seed.toLowerCase() === "c1")
    return C1Icon
  return `https://api.dicebear.com/6.x/miniavs/svg?seed=${seed}&size=${size}&backgroundType=gradientLinear&skinColor=fcd53f&mouth=default&backgroundColor=b6e3f4,c0aede`
}

export async function createSimilarityContext({
  messages,
  session_id,
}: {
  messages: Partial<TextMessageT>[]
  session_id: string
}) {
  // get session's model
  const session: ChatSessionT = await query({
    type: "sessions.getById",
    data: { session_id },
  })
  if (!session) return false
  const module_meta = await getModuleDetails({
    model: session.settings.module.variant,
  })
  if (!module_meta) return error({ message: "module not found" })

  // get the 5 last messages
  let latest_messages: string[] = []
  if (messages && messages.length > 0) {
    latest_messages = _(messages)
      .filter((p) => p.type === "human")
      ?.slice(-5)
      .map((m) => m.text)
      .compact()
      .value()
  }
  // get 3 most "relevant" context chunks
  const context: {
    pageContent: string
    metadata: { id: string; name: string }
  }[] = await queryIndex({
    query: latest_messages.join("\n"),
    source: "session",
    session_id,
    result_count: 10,
  })
  let ctx = ""
  let included_data_refs: string[] = []

  const mem_session: mChatSessionT | false = getMemoryState<mChatSessionT>({
    id: `session-${session_id}`,
  })
  let total_used_tokens = 0
  if (mem_session) {
    total_used_tokens =
      mem_session.messages?.tokens + mem_session.input?.tokens || 0
  }
  if (context && context?.length > 0) {
    ctx = `# CONTEXT:\n\n`
    for (let i = 0; i < context.length; i++) {
      const c = context[i]
      const _c = `ID: ${c.metadata.id}\nDOC NAME: ${c.metadata.name}\n\n${c.pageContent}\n\n---\n\n`
      const _ctx = ctx + _c
      const toks = await tokenizeInput({
        model: session.settings.module.variant,
        input: _ctx,
      })
      if (toks) {
        const tokens_with_context = toks?.usedTokens + total_used_tokens
        if (tokens_with_context + 500 > module_meta.context_len) break
        ctx = _ctx
        included_data_refs.push(c.metadata.id)
      } else break
    }
    ctx += `\n\n# CONVERSATION:\n\n`
  }
  return { ctx, included_data_refs }
}

export async function createFullContext({
  session_id,
}: {
  session_id: string
}) {
  // fetch all associated data for the session
  const associated_data_refs: DataRefT[] = await query({
    type: "sessions.getData",
    data: { session_id },
  })
  if ("error" in associated_data_refs)
    return error({
      message: "failed to get associated data",
      data: associated_data_refs,
    })

  // get all data
  const { worker, terminate } = await getWorker({ file: "vector" })
  const associated_data = (await Promise.all(
    associated_data_refs.map(async (ref) => {
      let data: DataT = await query({
        type: "data.get",
        data: { id: ref.id },
      })
      if (!data) return error({ message: "failed to get data", data })
      // check if data is PDF
      if (data?.data.mime === "application/pdf") {
        // convert to text

        const text = await worker.extractPDFContent(data.data.content)
        if (text) return { ...data, data: { ...data.data, content: text } }
        else return { ...data }
      } else {
        return { ...data }
      }
    }),
  )) as DataT[]
  terminate()
  if ("error" in associated_data)
    return error({
      message: "failed to get associated data",
      data: associated_data,
    })

  // concat all data into a single string
  const ctx = associated_data
    .map((d) => {
      return `Name: ${d.meta?.name}\n\n${d.data.content}`
    })
    .join("\n\n---\n\n")

  return { ctx, included_data_refs: associated_data.map((d) => d.id) }
}

export async function compileInput({
  messages,
  template,
  session_id,
  rag_mode,
}: {
  messages: Partial<TextMessageT>[]
  template: any
  session_id: string
  rag_mode: "similarity" | "full" | "none"
}) {
  // create context
  let ctx: string | false = ""
  let included_data_refs: string[] = []

  switch (rag_mode) {
    case "none":
      ctx = ""
      included_data_refs = []
      break
    case "similarity":
      const _sc = await createSimilarityContext({ messages, session_id })
      if (_sc) {
        ctx = _sc.ctx
        included_data_refs = _sc.included_data_refs
      }
      break
    case "full":
      const _fc = await createFullContext({ session_id })
      if (_fc) {
        ctx = _fc.ctx
        included_data_refs = _fc.included_data_refs
      }
      break
  }
  if (!ctx) ctx = ""

  // process messages
  let input = ""
  messages.forEach((msg) => {
    switch (msg?.type) {
      case "human":
        input += `${template?.prompt_start || ""}${msg.text}${
          template?.prompt_end || ""
        }`
        break
      case "system":
        input += `${template?.system_start || ""}${msg.text}${
          template?.system_end || ""
        }`
        break
      case "ai":
        input += `${template?.assistant_start || ""}${msg.text}${
          template?.assistant_end || ""
        }`
        break
      default:
        throw new Error(`Unknown message type: ${msg?.type}`)
    }
  })
  return { input, ctx, included_data_refs }
}
export async function getModuleDetails({ model }: { model: string }): Promise<
  | {
      module: ModelT["models"][0]
      context_len: number
      input_price: number
      output_price: number
    }
  | false
> {
  const mem_modules = getMemoryState<mModulesT>({ id: "modules" })
  if (!mem_modules) return error({ message: "Modules not found" })

  const module: ModelT["models"][0] = _(mem_modules.modules)
    .map((vendor: any) => {
      const _model = vendor.models.find((m: any) => m.id === model)
      return _model && { ..._model, name: `${vendor.meta.name} ${_model.name}` }
    })
    .compact()
    .first()
  if (!module) return error({ message: "Module not found" })

  const context_len = module.context_len
  if (!context_len)
    return error({ message: "Module's context length not found" })

  // get pricing
  const mem_prices = getMemoryState<mPricesT>({ id: "prices" })
  if (!mem_prices)
    return error({ message: "Prices not found. Are you offline?" })
  const pricing = mem_prices.prices.find((p) => p.id === model)
  if (!pricing)
    return error({ message: "Model prices not found. Are you offline?" })

  // make sure input_price and output_price are numbers
  const input_price = Number(pricing.input_price)
  const output_price = Number(pricing.output_price)

  return { module, context_len, input_price, output_price }
}

export async function tokenizeInput({
  model,
  input,
}: {
  model: string
  input: string
}) {
  const _m = await getModuleDetails({ model })
  if (!_m) return error({ message: "module not found" })
  const { module } = _m

  if (!module?.tokenizer?.tokenizer_type || !module?.tokenizer?.tokenizer_name)
    return error({ message: "tokenizer not found" })
  const costs = await calculateTokenCost({
    tokenizer_type: module?.tokenizer?.tokenizer_type,
    tokenizer_name: module?.tokenizer?.tokenizer_name,
    input,
    model: module,
    io: "input",
    costs: { input: 0, output: 0 },
  })

  return costs
}

export async function tokenizeMessages({
  model,
  messages,
}: {
  model: string
  messages: TextMessageT[]
}) {
  const _m = await getModuleDetails({ model })
  if (!_m) return error({ message: "module not found" })
  const { module } = _m

  // reverse messages
  const _msgs = _(messages).reject({ status: "deleted" }).value()

  const { input, ctx } = await compileInput({
    session_id: "",
    rag_mode: "none",
    messages: _msgs,
    template: module.template,
  })
  if (!module?.tokenizer?.tokenizer_type || !module?.tokenizer?.tokenizer_name)
    return error({ message: "tokenizer not found" })
  const costs = await calculateTokenCost({
    tokenizer_type: module?.tokenizer?.tokenizer_type,
    tokenizer_name: module?.tokenizer?.tokenizer_name,
    input: input + "\n\n" + ctx,
    model: module,
    io: "input",
    costs: { input: 0, output: 0 },
  })

  return costs
}

export async function compileSlidingWindowMemory({
  model,
  prompt,
  messages,
  session_id,
  rag_mode = "full",
}: {
  model: string
  prompt: { instructions?: string; user?: string }
  messages: TextMessageT[]
  session_id: string
  rag_mode?: "similarity" | "full" | "none"
}) {
  const _m = await getModuleDetails({ model })
  if (!_m) return error({ message: "module not found" })
  const { module, input_price, output_price } = _m

  // reverse messages
  const _msgs = _(messages).reject({ status: "deleted" }).value()

  const { input, ctx, included_data_refs } = await compileInput({
    session_id,
    rag_mode,
    messages: [
      {
        type: "system",
        text: prompt.instructions || "",
      },
      {
        type: "human",
        text: prompt.user || "",
      },
      ..._msgs,
    ],
    template: module.template,
  })
  if (!module?.tokenizer?.tokenizer_type || !module?.tokenizer?.tokenizer_name)
    return error({ message: "tokenizer not found" })

  const costs = await calculateTokenCost({
    tokenizer_type: module?.tokenizer?.tokenizer_type,
    tokenizer_name: module?.tokenizer?.tokenizer_name,
    input: input + "\n\n" + ctx,
    model: module,
    io: "input",
    costs: { input: input_price || 0, output: output_price || 0 },
  })

  const included_ids: string[] = []
  for (let i = 0; i < _msgs.length; i++) {
    const m = _msgs[i]
    included_ids.push(m.id)
  }

  return {
    history: _msgs,
    included_ids: _.map(_msgs, "id"),
    included_data_refs,
    token_count: costs.usedTokens,
    usd_cost: costs.usedUSD,
    prompt,
    ctx,
  }
}
