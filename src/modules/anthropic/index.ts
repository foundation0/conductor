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
import { BufferMemory } from "langchain/memory"
import { TextMessageS } from "@/data/schemas/sessions"
import _ from "lodash"
import Icon from "./icon.svg"

export const specs: z.infer<typeof ModuleS> = {
  _v: 1,
  id: "anthropic",
  meta: {
    name: "Claude",
    type: "LLM",
    author: "0x000",
    vendor: { name: "Anthropic" },
    variants: [
      {
        id: "claude-1",
        context_len: 4096,
        cost: 0.02,
        type: "language",
      },
      {
        id: "claude-1-100k",
        context_len: 100000,
        cost: 0.002,
        type: "language",
      },
    ],
    icon: Icon,
  },
  settings: {
    api_url: "",
    api_key: "",
  },
  streaming: true,
}

const InputS = z.object({
  model: z.enum(["claude-1", "claude-1-100k"]).default("claude-1"),
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
export const main = async (input: InputT, callbacks: z.infer<typeof StreamingS>) => {
  const { model, prompt, max_tokens, temperature, top_p, n, api_key, history } = InputS.parse(input)
  const { onData, onClose, onError } = StreamingS.parse(callbacks)

  return "TBD"
  const llm = new ChatOpenAI({
    temperature: temperature || 0,
    openAIApiKey: api_key,
    streaming: true,
    modelName: model || "gpt-3.5-turbo",
    modelKwargs: {
      max_tokens: max_tokens || 2000,
      top_p: top_p || 1,
      n: n || 1,
    },
  })

  const llm_prompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(prompt.instructions || ""),
    new MessagesPlaceholder("memory"),
    HumanMessagePromptTemplate.fromTemplate("{input}"),
  ])

  const memory = new BufferMemory({ returnMessages: true, memoryKey: "memory" })

  if (history && history.length > 1) {
    for (let i = 0; i < history.length; i += 2) {
      if (history[i].type === "human" && history[i + 1]?.type === "ai" && history[i].hash !== "1337") {
        await memory.saveContext({ input: history[i].text }, { output: history[i + 1]?.text || "" })
      } else {
        console.warn("Unexpected message sequence at index", i)
      }
    }
    if (_.last(history)?.type === "human" && _.last(history)?.hash) {
      await memory.saveContext({ input: _.last(history)?.text }, { output: "" })
    }
  }

  const chain = new ConversationChain({
    memory,
    prompt: llm_prompt,
    llm,
  })

  try {
    const response = await chain.call({ input: prompt.user }, [
      {
        handleLLMNewToken(token: string) {
          if (typeof onData === "function") onData({ data: token })
        },
        handleLLMEnd() {
          if (typeof onClose === "function") onClose({ reason: "end" })
        },
        handleLLMError(error: string) {
          if (typeof onError === "function") onError({ error })
        },
      },
    ])
    return response?.response
  } catch (error) {
    if (typeof onError === "function") onError({ error: JSON.stringify(error) })
  }
}
