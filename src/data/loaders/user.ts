import { store } from "@/data/storage/localStorage"
import { UserS } from "@/data/schemas/user"
import * as z from "zod"
import { buf2hex, getAddress, keyPair } from "@/security/common"
import { state as AppState } from "@/data/loaders/app"
import { specs as OpenAI } from "@/modules/openai/"
import { specs as Anthropic } from "@/modules/anthropic/"
import ExampleProjectIcon from "@/assets/example-project-icon.svg"
import ExampleProjectIcon2 from "@/assets/icons/venn.svg"
export type UserT = z.infer<typeof UserS>
export const state = await store<UserT>({
  name: "user",
  initial: async (): Promise<UserT> => {
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

    const keypair = keyPair()
    const id = getAddress({ ...keypair })
    return {
      _v: 1,
      id,
      public_key: buf2hex({ input: keypair.public_key }),
      meta: {
        name: "Anon", // generateUsername(" "),
      },
      modules: {
        installed: [OpenAI, Anthropic],
      },
      workspaces: [
        {
          _v: 1,
          id: active_session.workspace_id,
          name: "Project",
          members: { _v: 1, read: [id], write: [id] },
          icon: ExampleProjectIcon2,
          defaults: {
            llm_module: {
              id: "openai",
              variant: "gpt-3.5-turbo",
            },
          },
          groups: [
            {
              _v: 1,
              id: active_session.group_id,
              name: "Workspace",
              folders: [
                {
                  _v: 1,
                  id: active_session.folder_id as string,
                  name: "My folder",
                  sessions: [{ _v: 1, id: active_session.session_id, name: "Untitled", icon: "📝" }],
                },
              ],
            },
          ],
        },
      ],
    }
  },
  ztype: UserS,
})
