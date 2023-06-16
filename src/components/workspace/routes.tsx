import Workspace from "."
import { AppState, UserState } from "@/data/loaders"
import { ActionFunctionArgs, redirect } from "react-router-dom"
import UserActions from "@/data/actions/user"
import WorkspaceCreate from "@/components/workspace/create"
import { SessionIdR, SessionR } from "@/components/workspace/sessions/routes"
import WorkspaceSettings from "@/components/workspace/settings"
import _ from "lodash"
import { SessionS } from "@/data/schemas/workspace"
import { z } from "zod"

export const WorkspaceCreateR = {
  path: "create",
  element: <WorkspaceCreate />,
}

export const GroupR = {
  path: "group",
  action: async ({ request }: ActionFunctionArgs) => {
    let formData = await request.formData()
    let response = { ok: false }
    switch (request.method.toLowerCase()) {
      case "put":
        // Create new group
        await UserActions.addGroup({
          name: formData.get("name") as string,
          workspace_id: formData.get("workspace_id") as string,
        })
        response.ok = true
        break
      case "post":
        // Update group
        break
      case "delete":
        // Delete group
        await UserActions.deleteGroup({
          group_id: formData.get("group_id") as string,
          workspace_id: formData.get("workspace_id") as string,
        })
        response.ok = true
        break
    }
    return response
  },
}

export const FolderR = {
  path: "folder",
  action: async ({ request }: ActionFunctionArgs) => {
    let formData = await request.formData()
    let response = { ok: false }
    switch (request.method.toLowerCase()) {
      case "put":
        // Create new folder
        await UserActions.addFolder({
          name: formData.get("name") as string,
          group_id: formData.get("group_id") as string,
          workspace_id: formData.get("workspace_id") as string,
        })
        response.ok = true
        break
      case "post":
        // Update folder
        break
      case "delete":
        // Delete folder
        await UserActions.deleteFolder({
          folder_id: formData.get("folder_id") as string,
          group_id: formData.get("group_id") as string,
          workspace_id: formData.get("workspace_id") as string,
        })
        response.ok = true
        break
    }
    return response
  },
}

export const WorkspaceR = {
  path: "workspace",
  action: async ({ request }: ActionFunctionArgs) => {
    let formData = await request.formData()

    switch (request.method.toLowerCase()) {
      case "put":
        let name = formData.get("name")
        if (typeof name === "string" && name) {
          const nw = await UserActions.addWorkspace({ name })
          if (!nw) return { ok: false }
          return redirect(`/conductor/${nw.id}`)
        }
        return { ok: false }

      case "delete":
        // get all workspace's sessions
        const workspace_id = formData.get("workspace_id")
        if (typeof workspace_id !== "string") return { ok: false }
        const workspace = UserState.get().workspaces.find((w) => w.id === workspace_id)
        if (!workspace) return { ok: false }
        const workspace_sessions = workspace.groups.flatMap((g) => g.folders.flatMap((f) => f.sessions)) as z.infer<typeof SessionS>[]

        // delete all workspace's sessions from app state's open sessions
        if (workspace_sessions.length > 0) {
          const app_state = AppState.get()
          const open_sessions = app_state.open_sessions
          const open_sessions_ids = open_sessions.map((s) => s.session_id)
          const open_sessions_to_delete = _.intersection(
            open_sessions_ids,
            workspace_sessions.map((s) => s?.id)
          )
          const updated_open_sessions = open_sessions.filter((s) => !open_sessions_to_delete.includes(s.session_id))

          // delete all workspace's sessions from app states's active sessions
          const active_sessions_ids = Object.keys(app_state.active_sessions)
          const active_sessions_to_delete = _.intersection(
            active_sessions_ids,
            workspace_sessions.map((s) => s.id)
          )
          const updated_active_sessions = _.omit(app_state.active_sessions, active_sessions_to_delete)

          // update app state with new open and active sessions
          await AppState.set({
            ...app_state,
            open_sessions: updated_open_sessions,
            active_sessions: updated_active_sessions,
          })
        }
        // delete all workspace from user state
        const user_state = UserState.get()
        const updated_workspaces = user_state.workspaces.filter((w) => w.id !== workspace_id)
        await UserState.set({
          ...user_state,
          workspaces: updated_workspaces,
        })

        // find next workspace to redirect to
        const next_workspace = updated_workspaces[0]

        if (next_workspace) {
          // find its first session
          const next_workspace_first_session = next_workspace.groups.flatMap((g) => g.folders.flatMap((f) => f.sessions))[0]
          return redirect(`/conductor/${next_workspace.id}/${next_workspace_first_session?.id || ""}`)
        } else {
          return redirect("/conductor/create")
        }
    }
    return { ok: false }
  },
  children: [WorkspaceCreateR, GroupR, FolderR, SessionR],
}

export const WorkspaceSettingsR = {
  loader: async function () {
    const data = {
      user_state: UserState.get(),
    }
    return data
  },
  path: "settings",
  element: <WorkspaceSettings />,
}

export const WorkspaceIdR = {
  path: ":workspace_id",
  element: <Workspace />,
  loader: async function () {
    const data = {
      app_state: AppState.get(),
      user_state: UserState.get(),
    }
    return data
  },
  children: [WorkspaceSettingsR, SessionIdR],
}
