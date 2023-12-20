import { store } from "../storage/IDB"
import { AppStateS } from "../schemas/app"
import * as z from "zod"
import { getId } from "@/security/common"
import { nanoid } from "nanoid"
import { getActiveUser } from "@/libraries/active_user"
import _ from "lodash"
import { error } from "@/libraries/logging"
import { createMemoryState } from "@/libraries/memory"

let cache: any = null

export type AppStateT = z.infer<typeof AppStateS>
export const state = async () => {
  if (!cache) {
    cache = await store<AppStateT>({
      name: "appstate",
      initial: async (): Promise<AppStateT | null> => {
        const active_user = getActiveUser()
        if (!active_user) return null
        // TODO: get these from active_user

        const initial_workspace_id = active_user.workspaces[0].id
        const initial_group_id = active_user.workspaces[0].groups[0].id
        const initial_folder_id =
          active_user.workspaces[0].groups[0].folders[0].id
        const initial_session_id = _.get(
          active_user,
          "workspaces[0].groups[0].folders[0].sessions[0]",
        )?.id
        if (!initial_session_id) {
          error({ message: "No initial session id" })
          return null
        }
        return {
          _v: 1,
          active_workspace_id: initial_workspace_id,
          active_sessions: {
            [initial_workspace_id]: {
              // workspace_id
              _v: 1,
              workspace_id: initial_workspace_id,
              group_id: initial_group_id,
              session_id: initial_session_id,
              folder_id: initial_folder_id,
            },
          },
          open_folders: [
            {
              _v: 1,
              workspace_id: initial_workspace_id,
              group_id: initial_group_id,
              folder_id: initial_folder_id,
            },
          ],
          open_sessions: [
            {
              _v: 1,
              workspace_id: initial_workspace_id,
              group_id: initial_group_id,
              folder_id: initial_folder_id,
              session_id: initial_session_id,
            },
          ],
        }
      },
      ztype: AppStateS,
    })
    createMemoryState({ id: "appstate", state: await cache?.get() })
  }
  return cache
}
