import * as z from "zod"
import { ModuleS, StreamingS } from "@/data/schemas/modules"
import { ChatOpenAI } from "langchain/chat_models/openai"
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
} from "langchain/prompts"
import { ConversationChain } from "langchain/chains"
import { BufferMemory, BufferWindowMemory } from "langchain/memory"
import { TextMessageS } from "@/data/schemas/sessions"
import _ from "lodash"
// @ts-ignore
import Icon from "./icon.svg?dataurl"

export const specs: z.infer<typeof ModuleS> = {
  _v: 1,
  _updated: 1,
  id: "openai",
  active: true,
  meta: {
    author: "0x000",
    description:
      "OpenAI is a for-profit artificial intelligence company, focused on creating proprietary AI models available via APIs.",
    name: "ChatGPT",
    type: "LLM",
    vendor: { name: "OpenAI" },
    variants: [
      {
        id: "gpt-3.5-turbo",
        type: "language",
        context_len: 4096,
        cost_input: 0.0015,
        cost_output: 0.002,
        color: "#28a08c",
      },
      {
        id: "gpt-3.5-turbo-16k",
        type: "language",
        context_len: 16384,
        cost_input: 0.003,
        cost_output: 0.004,
        color: "#28a08c",
      },
      {
        id: "gpt-4",
        type: "language",
        context_len: 8192,
        cost_input: 0.03,
        cost_output: 0.06,
        color: "#ac67ff",
      },
      {
        id: "gpt-4-32k",
        type: "language",
        active: false,
        context_len: 32768,
        cost_input: 0.06,
        cost_output: 0.12,
        color: "#ac67ff",
      },
    ],
    icon: Icon,
  },
  settings: {
    api_key: "",
    max_tokens: 2000,
    temperature: 0,
    top_p: 1,
    n: 0,
    frequency_penalty: 0,
    presence_penalty: 0,
    stop: "",
  },
  streaming: true,
}

const InputS = z.object({
  model: z.string().default("gpt-3.5-turbo"),
  api_key: z.string().nonempty(),
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
  const { model, prompt, settings, api_key, history } = InputS.parse(input)
  const { setGenController, onData, onClose, onError } = StreamingS.parse(callbacks)

  const llm = new ChatOpenAI({
    temperature: settings?.temperature || 0,
    openAIApiKey: api_key,
    streaming: true,
    modelName: model || "gpt-3.5-turbo",
    modelKwargs: settings || {},
  })

  const controller = new AbortController()
  setGenController && setGenController(controller)

  const llm_prompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(prompt.instructions || ""),
    new MessagesPlaceholder("memory"),
    HumanMessagePromptTemplate.fromTemplate("{input}"),
  ])

  const memory = new BufferMemory({ inputKey: "input", returnMessages: true, memoryKey: "memory" })

  if (history && history.length > 1) {
    for (let i = 0; i < history.length; i += 2) {
      if (history[i].type === "human" && history[i + 1]?.type === "ai" && history[i].hash !== "1337") {
        await memory.saveContext({ input: history[i].text }, { output: history[i + 1]?.text || "" })
      } else {
        console.warn("Unexpected message sequence at index", i)
      }
    }
    /* if (_.last(history)?.type === "human" && _.last(history)?.hash) {
      await memory.saveContext({ input: _.last(history)?.text }, { output: "" })
    } */
  }

  const chain = new ConversationChain({
    memory,
    prompt: llm_prompt,
    llm,
  })

  try {
    const response = await chain.call({ input: prompt.user, signal: controller.signal }, [
      {
        handleLLMNewToken(token: string) {
          if (typeof onData === "function") onData({ data: token })
        },
        handleLLMEnd() {
          if (typeof onClose === "function") onClose({ reason: "end" })
        },
        handleLLMError(err: any) {
          const error = {
            code: err.response.data.error.code,
            message: err.response.data.error.message,
            status: err.response.status,
          }
          if (error.message === "Cancel: canceled") return
          if (typeof onError === "function") onError(error)
        },
      },
    ])
    return response?.response as string
  } catch (error: any) {
    if (typeof onError === "function") {
      const err = {
        code: "catch-openai",
        message: error?.message || "Unknown error",
        status: error?.status || 500,
        data: error,
      }
      if (error.message === "Cancel: canceled") return ""
      onError(err)
    }
  }
  return ""
}
