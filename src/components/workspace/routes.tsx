import Workspace from "."
import { loader, initLoaders } from "@/data/loaders"
import { ActionFunctionArgs, redirect } from "react-router-dom"
import UserActions from "@/data/actions/user"
import WorkspaceCreate from "@/components/workspace/create"
import { SessionIdR, SessionR } from "@/components/workspace/sessions/routes"
import WorkspaceSettings from "@/components/workspace/settings"
import _ from "lodash"
import { SessionS } from "@/data/schemas/workspace"
import { z } from "zod"
import { AppStateT } from "@/data/loaders/app"
import { UserT } from "@/data/loaders/user"
import { ph } from "@/libraries/logging"
import { DataR } from "./data/routes"

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
        ph().capture("workspaces/groups/create")
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
        ph().capture("workspaces/folder/create")
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
          ph().capture("workspaces/create")
          return redirect(`/c/${nw.id}/${_.get(nw, "groups[0].folders[0].sessions[0].id") || ""}`)
        }
        return { ok: false }

      case "delete":
        const { AppState, UserState } = await initLoaders()
        // get all workspace's sessions
        const workspace_id = formData.get("workspace_id")
        if (typeof workspace_id !== "string") return { ok: false }
        const user: UserT = UserState.get()
        const workspace = user.workspaces.find((w) => w.id === workspace_id)
        if (!workspace) return { ok: false }
        const workspace_sessions = workspace.groups.flatMap((g) => g.folders.flatMap((f) => f.sessions)) as z.infer<
          typeof SessionS
        >[]

        // delete all workspace's sessions from app state's open sessions
        if (workspace_sessions.length > 0) {
          const app_state: AppStateT = AppState.get()
          const open_sessions = app_state.open_sessions
          const open_sessions_ids = open_sessions.map((s) => s.session_id)
          const open_sessions_to_delete = _.intersection(
            open_sessions_ids,
            workspace_sessions.map((s) => s?.id)
          )
          const updated_open_sessions = open_sessions.filter((s) => !open_sessions_to_delete.includes(s.session_id))

          // delete all workspace's folders froo app state's open folders
          const workspace_folders = workspace.groups.flatMap((g) => g.folders)
          const open_folders = app_state.open_folders
          const open_folders_ids = open_folders.map((f) => f.folder_id)
          const open_folders_to_delete = _.intersection(
            open_folders_ids,
            workspace_folders.map((f) => f.id)
          )
          const updated_open_folders = open_folders.filter((f) => !open_folders_to_delete.includes(f.folder_id))

          // delete all workspace's sessions from app states's active sessions
          const updated_active_sessions = _.cloneDeep(app_state.active_sessions)
          delete updated_active_sessions[workspace_id]

          // update app state with new open and active sessions
          await AppState.set({
            ...app_state,
            open_sessions: updated_open_sessions,
            open_folders: updated_open_folders,
            active_sessions: updated_active_sessions,
          })
        }
        // delete all workspace from user state
        const user_state: UserT = UserState.get()
        const updated_workspaces = user_state.workspaces.filter((w) => w.id !== workspace_id)
        await UserState.set({
          ...user_state,
          workspaces: updated_workspaces,
        })

        // find next workspace to redirect to
        const next_workspace = updated_workspaces[0]

        if (next_workspace) {
          // find its first session
          const next_workspace_first_session = next_workspace.groups.flatMap((g) =>
            g.folders.flatMap((f) => f.sessions)
          )[0]
          return redirect(`/c/${next_workspace.id}/${next_workspace_first_session?.id || ""}`)
        } else {
          return redirect("/c/create")
        }
    }
    return { ok: false }
  },
  children: [WorkspaceCreateR, GroupR, FolderR, SessionR],
}

export const WorkspaceSettingsR = {
  loader,
  path: "settings",
  element: <WorkspaceSettings />,
}

export const WorkspaceIdR = {
  path: ":workspace_id",
  element: <Workspace />,
  loader,
  children: [WorkspaceSettingsR, SessionIdR, DataR],
}
