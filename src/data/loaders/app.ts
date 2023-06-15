import { store } from "../storage/localStorage"
import { AppStateS } from "../schemas/app"
import * as z from "zod"
import { getId } from "@/security/common"
import { nanoid } from "nanoid"

export type AppStateT = z.infer<typeof AppStateS>
export const state = await store<AppStateT>({
  name: "appstate",
  initial: async (): Promise<AppStateT> => {
    const initial_workspace_id = getId()
    const initial_group_id = nanoid(10)
    const initial_folder_id = nanoid(10)
    const initial_session_id = getId()

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
          session_id: initial_session_id,
        },
      ],
    }
  },
  ztype: AppStateS,
})
