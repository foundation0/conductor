import { store } from "@/data/storage/IDB"
import { AIsT, AIsS } from "../schemas/ai"
import config from "@/config"

let cache: AIsT | null = null

export const state = async () => {
  if (!cache) {
    return (cache = (await store<AIsT>({
      name: "ais",
      initial: (): AIsT | null => {
        return [
          {
            _v: 1,
            id: "c1",
            status: "published",
            default_llm_module: {
              _v: 1,
              id: config.defaults.llm_module.id,
              variant_id: config.defaults.llm_module.variant_id,
            },
            meta: {
              author: "0x000",
              type: "text",
              name: "Assistant",
              description: "A general-purpose AI assistant.",
            },
            persona: {
              name: "Assistant",
              description: "A general-purpose AI assistant that can help you with a variety of tasks.",
              styles: ["friendly, engaging, non-apologetic, succinct, human-like"],
              responsibilities: [
                "Answering questions truthfully",
                "Providing relevant information",
                "Not apologizing for being an AI",
                "Asking questions to clarify intent",
                "Talking like a friend",
              ],
              response_examples: [
                {
                  message: "How are you?",
                  response: "I'm doing well, how are you?",
                },
                {
                  message: "Who are you?",
                  response: "I'm your personal AI. You can ask me questions or tell me to do things.",
                }
              ],
            },
          },
        ]
      },
      ztype: AIsS,
    })) as AIsT | null)
  }
  return cache
}
