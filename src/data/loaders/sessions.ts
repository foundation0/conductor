import { store } from "@/data/storage/IDB"
import { TextMessageS, ChatSessionS, SessionsS } from "@/data/schemas/sessions"
import * as z from "zod"
import _ from "lodash"
import { getActiveUser } from "@/libraries/active_user"
import config from "@/config"
import { createMemoryState } from "@/libraries/memory"

export type TextMessageT = z.infer<typeof TextMessageS>
export type ChatT = z.infer<typeof ChatSessionS>
export type SessionsT = z.infer<typeof SessionsS>

let cache: any = null

export const state = async () => {
  if (!cache) {
    cache = await store<SessionsT>({
      name: "sessions",
      initial: async (): Promise<SessionsT | null> => {
        const active_user = getActiveUser()
        if (!active_user) return null
        const session_id = _.get(
          active_user,
          "workspaces[0].groups[0].folders[0].sessions[0]",
        )?.id as string
        return {
          _v: 1,
          active: {
            [session_id]: {
              _v: 1,
              id: session_id,
              type: "chat",
              created_at: new Date(),
              messages: [],
              settings: {
                module: {
                  id: config.defaults.llm_module.id,
                  variant: config.defaults.llm_module.variant_id,
                },
                memory: {
                  rag_mode: "full",
                },
              },
            },
          },
        }
      },
      ztype: SessionsS,
    })
    createMemoryState({ id: "sessions", state: await cache?.get() })
  }
  return cache
}
