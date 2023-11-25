import * as z from "zod"
import { ModuleS, StreamingS } from "@/data/schemas/modules"
import { TextMessageS } from "@/data/schemas/sessions"
import _ from "lodash"
// @ts-ignore
import Icon from "./icon.svg?dataurl"
import config from "@/config"
import { error } from "@/libraries/logging"
import { PEClient } from "@/libraries/pe"
import eventEmitter from "@/libraries/events"
import { LLMVariantT } from "@/data/schemas/modules"

const variant_setting = {
  max_tokens: 2000,
  temperature: 0,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
}

export let specs: z.infer<typeof ModuleS> = {
  _v: 1,
  _updated: 1,
  id: "ule",
  active: true,
  meta: {
    author: "0x000",
    description: "Unified LLM Engine offers a standardized access to all major open-source and proprietary LLMs.",
    name: "LLM",
    type: "LLM",
    vendor: { name: "Unified LLM Engine" },
    variants: [
      {
        id: "openai_gpt-3.5-turbo",
        name: "OpenAI ChatGPT",
        type: "language",
        context_len: 4096,
        settings: variant_setting,
      },
    ],
    icon: Icon,
  },
  settings: {},
}

const InputS = z.object({
  user_id: z.string().min(1),
  model: z.string().default("openai_gpt-3.5-turbo"),
  prompt: z.object({
    instructions: z.string().optional(),
    user: z.string(),
  }),
  history: z.array(TextMessageS),
  settings: z
    .object({
      max_tokens: z.number().min(0).optional(),
      temperature: z.number().min(0).max(2).optional(),
      top_p: z.number().min(0).max(1).optional(),
      frequency_penalty: z.number().min(0).max(1).optional(),
      presence_penalty: z.number().min(0).max(1).optional(),
      n: z.number().optional(),
      stop: z.string().optional(),
    })
    .optional(),
})

export const OutputS = z.string()

type InputT = z.infer<typeof InputS>
type OutputT = z.infer<typeof OutputS>

export const main = async (input: InputT, callbacks: z.infer<typeof StreamingS>): Promise<OutputT> => {
  const { user_id, model, prompt, settings, history } = InputS.parse(input)
  const { setGenController, onData, onClose, onError } = StreamingS.parse(callbacks)

  if (!user_id) {
    error({ message: "user_id is required" })
    return "error"
  }

  return new Promise(async (resolve, reject) => {
    let output = ""

    const ULE = await PEClient({
      host: config.services.ule_URI,
      onData: (data) => {
        output += data
        if (typeof onData === "function") onData({ data })
      },
      onDone: (data) => {
        if (typeof onClose === "function") onClose(data)
        resolve(data)
      },
      onError: (err) => {
        const error = {
          code: err.code || "unknown",
          message: err.error || err.message || err || "unknown",
          status: "error",
          surpress: false,
        }
        if (error.message === "canceled") return resolve(output)
        if (error.code === 402) {
          eventEmitter.emit("ule:402", { user_id })
          error.surpress = true
        }
        if (typeof onError === "function") onError(error)
      },
    })

    setGenController && setGenController({ abort: () => ULE.abort({ user_id }) })

    const messages: any = [
      {
        type: "system",
        text: prompt.instructions || "You are a helpful assistant",
      },
      ...history.map((message) => {
        if (message.type === "human" && message.text) {
          return {
            type: "user",
            text: message.text,
          }
        } else if (message.type === "ai" && message.text) {
          return {
            type: "assistant",
            text: message.text,
          }
        }
      }),
    ]
    if (messages[messages.length - 1]?.type === "assistant" || messages.length === 1) {
      messages.push({
        type: "user",
        text: prompt.user,
      })
    }

    ULE.compute({
      type: "ComputeLLM",
      user_id,
      params: {
        model,
        messages,
        settings,
      },
    })
  })
}

export const fetchUpdates = async (): Promise<LLMVariantT[]> => {
  return []
}
