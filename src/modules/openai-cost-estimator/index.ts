import { ModuleS } from "@/data/schemas/modules"
import { z } from "zod"
import { GPTTokens } from "gpt-tokens"
import { set, get } from "@/data/actions/cache"
import { buf2hex, createHash } from "@/security/common"

export const specs: z.infer<typeof ModuleS> = {
  _v: 1,
  id: "openai-cost-estimator",
  meta: {
    name: "OpenAI Cost Estimator",
    type: "utility",
    vendor: { name: "OpenAI" },
  },
  streaming: false,
}

const InputS = z.object({
  model: z
    .enum([
      "gpt-3.5-turbo",
      "gpt-3.5-turbo-0301",
      "gpt-3.5-turbo-0613",
      "gpt-3.5-turbo-16k",
      "gpt-3.5-turbo-16k-0613",
      "gpt-4",
      "gpt-4-0314",
      "gpt-4-0613",
      "gpt-4-32k",
      "gpt-4-32k-0314",
      "gpt-4-32k-0613",
    ])
    .default("gpt-3.5-turbo"),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "system", "assistant"]),
        content: z.string(),
      })
    )
    .nonempty(),
})

const OutputS = z.object({
  tokens: z.number(),
  usd: z.number(),
})

export type InputT = z.infer<typeof InputS>
export type OutputT = z.infer<typeof OutputS>

export async function main(input: InputT): Promise<OutputT> {
  const { model, messages } = InputS.parse(input)

  const contents_hash = buf2hex({ input: createHash({ str: JSON.stringify(messages) }) })
  const cacheKey = `openai-cost-estimator-${model}-${contents_hash}`
  const cached = await get(cacheKey)
  if (cached) {
    console.log("using cached")
    return cached
  }
  console.log("missed cached")

  const calcs = new GPTTokens({
    plus: false,
    model,
    messages,
  })
  const { usedTokens, usedUSD } = calcs
  set({ key: cacheKey, value: { tokens: usedTokens, usd: usedUSD } })
  return { tokens: usedTokens, usd: usedUSD }
}