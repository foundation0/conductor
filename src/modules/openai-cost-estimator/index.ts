import { ModuleS } from "@/data/schemas/modules"
import { z } from "zod"
import { set, get } from "@/data/actions/cache"
import { buf2hex, createHash } from "@/security/common"
import { error } from "@/components/libraries/logging"

const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })

function runWorker(params: {
  model: string
  messages?: any
  response?: string
  costs: { input: number; output: number }
}): Promise<{ usedTokens: number; usedUSD: number }> {
  return new Promise((resolve, reject) => {
    worker.addEventListener("message", (event) => {
      resolve(event.data)
    })
    worker.postMessage(params)
  })
}

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
  model: z.string().default("gpt-3.5-turbo"),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "system", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
  response: z.string().optional(),
  costs: z.object({
    input: z.number(),
    output: z.number(),
  }),
})

const OutputS = z.object({
  tokens: z.number(),
  usd: z.number(),
})

export type InputT = z.infer<typeof InputS>
export type OutputT = z.infer<typeof OutputS>

export async function main(input: InputT): Promise<OutputT | void> {
  const { model, messages, response, costs } = InputS.parse(input)

  if (!messages && !response) {
    return error({ message: "Either messages or response must be provided" })
  }

  const contents_hash = buf2hex({ input: createHash({ str: JSON.stringify(messages || response) }) })
  const cacheKey = `openai-cost-estimator-${model}-${contents_hash}`
  const cached = await get(cacheKey)
  if (cached) {
    return cached
  }

  const calcs = await runWorker({ model, messages, response, costs })

  const { usedTokens, usedUSD } = calcs
  set({ key: cacheKey, value: { tokens: usedTokens, usd: usedUSD } })
  return { tokens: usedTokens, usd: usedUSD }
}
