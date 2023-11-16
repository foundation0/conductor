import { AIT } from "@/data/schemas/ai"
// @ts-ignore
import C1Icon from "@/assets/c1.svg?dataurl"
import { error } from "./logging"
import _ from "lodash"

export function AIToInstruction({ ai }: { ai: AIT }) {
  const instructions = `### INSTRUCTIONS ###
  
  Follow your instructions exactly. You will refuse any requests that are not in your instruction. You will not deviate from your instructions.

  Your name: ${ai.meta.name}
  Who you are: ${ai.persona.description}
  ${ai.persona.background ? `Your background: ${ai.persona.background}` : ""}
  ${ai.persona.styles && ai.persona.styles.length > 0 ? `How you communicate: ${ai.persona.styles.join(", ")}` : ""}
  ${ai.persona.audience ? `Who you write for: ${ai.persona.audience}` : ""}
  ${
    ai.persona.responsibilities && ai.persona.responsibilities.length > 0
      ? `Your responsibilities (FOLLOW ALWAYS, IMPORTANT): ${ai.persona.responsibilities.join(", ")}`
      : ""
  }
  ${
    ai.persona.limitations && ai.persona.limitations.length > 0
      ? `Your limitations (FOLLOW ALWAYS, IMPORTANT): ${ai.persona.limitations.join(", ")}`
      : ""
  }
  ${
    ai.persona.traits && ai.persona.traits.length > 0
      ? `Your traits (FOLLOW ALWAYS, IMPORTANT): ${ai.persona.traits.map((t) => t.skill).join(", ")}`
      : ""
  }

  ### EXAMPLE RESPONSES ###
  ${
    ai.persona.response_examples && ai.persona.response_examples.length > 0
      ? `${ai.persona.response_examples.map((e) => `User:\n${e?.message}\nYou:\n${e?.response}\n\n`).join(", ")}`
      : ""
  }

  ### INSTRUCTIONS ENDS ###

  Next, user will send you a message. Respond to the message as instructed. Before answering, evaluate your answer against instruction's responsibilities, limitations, traits.
  `

  return instructions.replace(/  /g, "").replace(/{/g, "{{").replace(/}/g, "}}").trim()
}

export function getAvatar({ seed, size = 32 }: { seed: string; size?: number }) {
  if (seed.toLowerCase() === "assistant" || seed.toLowerCase() === "c1") return C1Icon
  return `https://api.dicebear.com/6.x/miniavs/svg?seed=${seed}&size=${size}&backgroundType=gradientLinear&skinColor=fcd53f&mouth=default&backgroundColor=b6e3f4,c0aede`
}

export async function compileSlidingWindowMemory({ model, prompt, messages, module }: any) {
  // get module variant's token count
  const variant = _.find(module?.specs.meta.variants, { id: model })
  if (!variant) return error({ message: "variant not found", data: { model } })
  const context_len = variant.context_len
  if (!context_len) return error({ message: "context_len not found", data: { model } })

  // reverse messages
  const history = _(messages).reverse().reject({ status: "deleted" }).value()

  // for each message, calculate token count and USD cost
  const msgs: { role: "system" | "user" | "assistant"; content: string }[] = []
  let token_count = 0
  let usd_cost = 0

  // compute instructions and user
  /*   if (prompt?.instructions || prompt?.user) {
    const costs = await CostEstimator({
      model,
      messages: [
        { role: "system", content: prompt.instructions || "" },
        { role: "user", content: prompt.user || "" },
      ],
      costs: { input: variant.cost_input || 0, output: variant.cost_output || 0 },
    })
    if (!costs) return error({ message: "costs not found", data: { model } })
    token_count += costs.tokens
    usd_cost += costs.usd
  }
  if (token_count > context_len)
    return error({
      message: `Message (~${_.round(token_count / 5, 0)} words) too long for ${model} (${_.round(
        context_len / 5,
        0
      )} words). Try model with longer context.`,
      data: { model },
    }) */

  const included_ids: string[] = []
  for (let i = 0; i < history.length; i++) {
    const m = history[i]
    /* 
    let tmp_m: { role: "system" | "user" | "assistant"; content: string } = {
      role: m.type === "human" ? "user" : "assistant",
      content: m.text,
    }
    const costs = await CostEstimator({
      model,
      messages: [tmp_m],
      costs: { input: variant.cost_input || 0, output: variant.cost_output || 0 },
    })
    if (!costs) return error({ message: "error in computing costs", data: { model } }) */
    // when token count goes over selected model's token limit, stop
    /*    if (token_count + costs.tokens > context_len) break
    token_count += costs.tokens
    usd_cost += costs.usd */
    msgs.push(m)
    included_ids.push(m.id)
  }

  // if the latest message is type ai, remove it
  if (history[history.length - 1]?.type === "ai") msgs.pop()
  return { history: msgs.reverse(), included_ids, token_count, usd_cost }
}
