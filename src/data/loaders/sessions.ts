import { store } from "@/data/storage/localStorage"
import { TextMessageS, ChatS, SessionsS } from "@/data/schemas/sessions"
import * as z from "zod"
import { state as AppState } from "@/data/loaders/app"

export type TextMessageT = z.infer<typeof TextMessageS>
export type ChatT = z.infer<typeof ChatS>
export type SessionsT = z.infer<typeof SessionsS>

export const state = await store<SessionsT>({
  name: "sessions",
  initial: async (): Promise<SessionsT> => {
    // make sure app state has initialized
    async function getActiveSession(): Promise<ReturnType<typeof AppState.get>["active_sessions"][string]> {
      const app_state = AppState.get()
      const active_session = app_state.active_sessions[app_state.active_workspace_id]
      if (!active_session) {
        // throw new Error("No active session")
        await new Promise((resolve) => setTimeout(resolve, 50))
        return getActiveSession()
      }
      return active_session
    }
    const active_session = await getActiveSession()
    if (!active_session) throw new Error("No active session")

    return {
      _v: 1,
      active: {
        [active_session.session_id]: {
          _v: 1,
          id: active_session.session_id,
          type: "chat",
          created_at: new Date(),
          messages: [],
          settings: {
            module: {
              id: "openai",
              variant: "gpt-3.5-turbo",
            },
          },
        },
      },
    }
  },
  ztype: SessionsS,
})
