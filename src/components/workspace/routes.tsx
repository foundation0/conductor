import Workspace from "."
import { AppState, UserState } from "@/data/loaders"
import { ActionFunctionArgs, redirect } from "react-router-dom"
import UserActions from "@/data/actions/user"
import WorkspaceCreate from "@/components/workspace/create"
import { SessionIdR, SessionR } from "@/components/workspace/sessions/routes"
import WorkspaceSettings from "@/components/workspace/settings"

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

    // Create new workspace
    if (request.method.toLowerCase() === "put") {
      let name = formData.get("name")
      if (typeof name === "string" && name) {
        const nw = await UserActions.addWorkspace({ name })
        if (!nw) return { ok: false }
        return redirect(`/conductor/${nw.id}`)
      }
      return { ok: false }
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
