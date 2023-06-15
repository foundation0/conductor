import { AppStateT, state as AState } from "@/data/loaders/app"
import { UserT } from "@/data/loaders/user"
import { ActiveSessionS, AppStateS, OpenSessionS } from "@/data/schemas/app"
import { FolderS, GroupS, WorkspaceS } from "@/data/schemas/workspace"
import { z } from "zod"
import { nanoid } from "nanoid"
import _ from "lodash"
import { AppState, UserState } from "@/data/loaders"
import UserActions from "@/data/actions/user"

async function getActiveWorkspace() {
  const app_state: AppStateT = AppState.get()
  const user_state: UserT = UserState.get()
  return app_state.active_workspace_id
    ? user_state.workspaces.find((workspace) => workspace.id === app_state.active_workspace_id)
    : undefined
}

export default {
  updateAppState: async function (new_state: Partial<AppStateT>) {
    const state: AppStateT = AppState.get()
    const updated_state = { ...state, ...new_state }
    if (!AppStateS.safeParse(updated_state).success) throw new Error("Invalid state")
    await AState.set(updated_state)
    return true
  },
  _addWorkspaceToAppState: async function ({ workspace }: { workspace: z.infer<typeof WorkspaceS> }) {
    const app_state: AppStateT = AppState.get()
    await AState.set({
      ...app_state,
      active_workspace_id: workspace.id,
      active_sessions: {
        ...app_state.active_sessions,
        [workspace.id]: {
          _v: 1,
          session_id: "default-session",
          workspace_id: workspace.id,
          group_id: "default-group",
          folder_id: "default-folder",
        },
      },
      open_sessions: [
        ...app_state.open_sessions,
        {
          _v: 1,
          session_id: nanoid(),
          workspace_id: workspace.id,
          group_id: "default-group",
          folder_id: "default-folder",
        },
      ],
    })
  },
  removeOpenSession: async function ({ session_id }: { session_id: string }) {
    const app_state: AppStateT = AppState.get()
    const active_workspace = await getActiveWorkspace()
    const open_sessions_for_workspace = app_state.open_sessions.filter(
      (open_session) => open_session.workspace_id === active_workspace?.id
    )

    // remove session from app state
    const new_open_sessions = app_state.open_sessions.filter(
      (open_session: z.infer<typeof OpenSessionS>) => open_session.session_id !== session_id
    )

    // select the previous tab
    const tab_index = _.findIndex(open_sessions_for_workspace, { session_id })
    if (tab_index === -1) return
    let new_active_tab = tab_index === 0 ? 0 : tab_index - 1

    // if there is none, select the default tab
    if (new_active_tab === -1 && active_workspace) {
      await UserActions.addSession({
        active_workspace,
      })
      new_active_tab = 0
    }

    // update workspace's active session
    app_state.open_sessions = new_open_sessions
    if (!active_workspace?.id) {
      console.warn("active workspace not found")
      return
    }
    app_state.active_sessions[active_workspace.id] = open_sessions_for_workspace[new_active_tab]

    await AState.set(app_state)

    return open_sessions_for_workspace[new_active_tab]
  },
  changeActiveSession: async function ({ session_id }: { session_id: string }) {
    const app_state: AppStateT = AppState.get()

    const active_workspace = await getActiveWorkspace()
    if (!active_workspace) {
      console.warn("active workspace not found")
      return
    }

    // get group_id and folder_id for the session_id

    const group: z.infer<typeof GroupS> | undefined = active_workspace.groups.find((group) =>
      group.folders?.find((folder) => folder.sessions?.find((session) => session.id === session_id))
    )
    if (!group) {
      console.warn("group not found")
      return
    }
    const folder: z.infer<typeof FolderS> | undefined = group.folders.find((folder) =>
      folder.sessions?.find((session) => session.id === session_id)
    )
    if (!folder) {
      console.warn("folder not found")
      return
    }

    const active_session: z.infer<typeof ActiveSessionS> = {
      _v: 1,
      session_id,
      workspace_id: active_workspace.id,
      group_id: group.id,
      folder_id: folder.id,
    }
    if (!active_session) {
      console.warn("active session not found")
      return
    }

    // if active_session is not in open_sessions, add it
    let new_open_sessions = app_state.open_sessions
    if (!app_state.open_sessions.find((open_session) => open_session.session_id === session_id)) {
      new_open_sessions.push(active_session)
    }

    await AState.set({
      ...app_state,
      active_sessions: {
        ...app_state.active_sessions,
        [active_workspace.id]: active_session,
      },
      open_sessions: new_open_sessions,
    })
    if (active_session) {
      // router.navigate({ from: '/conductor', to: `/conductor/:session_id`})
    }
    return active_session
  },
}
