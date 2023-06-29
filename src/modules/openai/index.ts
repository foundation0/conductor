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
import Icon from "./icon.svg"

export const specs: z.infer<typeof ModuleS> = {
  _v: 1,
  id: "openai",
  meta: {
    name: "ChatGPT",
    type: "LLM",
    vendor: { name: "OpenAI" },
    variants: [
      {
        id: "gpt-4",
        context_len: 8192,
        cost_input: 0.03,
        cost_output: 0.06,
      },
      {
        id: "gpt-3.5-turbo",
        context_len: 4096,
        cost_input: 0.0015,
        cost_output: 0.002,
      },
      {
        id: "gpt-4-32k",
        context_len: 32768,
        cost_input: 0.06,
        cost_output: 0.12,
      },
      {
        id: "gpt-3.5-turbo-16k",
        context_len: 16384,
        cost_input: 0.003,
        cost_output: 0.004,
      },
    ],
    icon: Icon,
  },
  settings: {
    api_url: "https://api.openai.com/",
    api_key: "",
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
  max_tokens: z.number().optional(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  n: z.number().optional(),
})

export const OutputS = z.string()

type InputT = z.infer<typeof InputS>
type OutputT = z.infer<typeof OutputS>

export const main = async (input: InputT, callbacks: z.infer<typeof StreamingS>): Promise<OutputT> => {
  const { model, prompt, max_tokens, temperature, top_p, n, api_key, history } = InputS.parse(input)
  const { setGenController, onData, onClose, onError } = StreamingS.parse(callbacks)

  const llm = new ChatOpenAI({
    temperature: temperature || 0,
    openAIApiKey: api_key,
    streaming: true,
    modelName: model || "gpt-3.5-turbo",
    modelKwargs: {
      max_tokens: max_tokens || null,
      top_p: top_p || 1,
      n: n || 1,
    },
  })

  const controller = new AbortController()
  setGenController(controller)

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
      onError(err)
    }
  }
  return ""
}
