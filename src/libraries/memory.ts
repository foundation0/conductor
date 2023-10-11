import _ from "lodash"
import { error } from "./logging"
import { main as CostEstimator } from "@/modules/openai-cost-estimator/"

export async function compileSlidingWindowMemory({ model, prompt, messages, module }: any) {
  // get module variant's token count
  const variant = _.find(module?.specs.meta.variants, { id: model })
  if (!variant) return error({ message: "variant not found", data: { model } })
  const context_len = variant.context_len
  if (!context_len) return error({ message: "context_len not found", data: { model } })

  // reverse messages
  const history = _.reverse(messages)

  // for each message, calculate token count and USD cost
  const msgs: { role: "system" | "user" | "assistant"; content: string }[] = []
  let token_count = 0
  let usd_cost = 0

  // compute instructions and user
  if (prompt?.instructions || prompt?.user) {
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
    })

  const included_ids: string[] = []
  for (let i = 0; i < history.length; i++) {
    const m = history[i]
    let tmp_m: { role: "system" | "user" | "assistant"; content: string } = {
      role: m.type === "human" ? "user" : "assistant",
      content: m.text,
    }
    const costs = await CostEstimator({
      model,
      messages: [tmp_m],
      costs: { input: variant.cost_input || 0, output: variant.cost_output || 0 },
    })
    if (!costs) return error({ message: "error in computing costs", data: { model } })
    // when token count goes over selected model's token limit, stop
    if (token_count + costs.tokens > context_len) break
    token_count += costs.tokens
    usd_cost += costs.usd
    msgs.push(m)
    included_ids.push(m.id)
  }

  // if the latest message is type ai, remove it
  if (history[history.length - 1]?.type === "ai") msgs.pop()
  return { history: msgs.reverse(), included_ids, token_count, usd_cost }
}
