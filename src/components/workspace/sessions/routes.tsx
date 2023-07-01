import { ActionFunctionArgs, redirect } from "react-router-dom"
import Sessions from "."
import { initLoaders } from "@/data/loaders"
import SessionActions from "@/data/actions/sessions"
import { AppStateT } from "@/data/loaders/app"
import _ from "lodash"

export const SessionIdR = {
  path: ":session_id",
  element: <Sessions />,
  loader: async () => { _
    const { AppState, UserState, SessionState, ClipboardState, MessagesState } = await initLoaders()
    const app_state: AppStateT = await AppState.get()
    const user_state = await UserState.get()
    const sessions_state = await SessionState.get()
    const clipboard_state = await ClipboardState.get()
    const messages_state = _.get(app_state, `active_sessions[${app_state?.active_workspace_id}].session_id`)
      ? await MessagesState({ session_id: _.get(app_state, `active_sessions[${app_state?.active_workspace_id}].session_id`) })
      : []
    return { app_state, user_state, sessions_state, clipboard_state, messages_state, MessagesState }
  },
}

export const SessionR = {
  path: "session",
  action: async ({ request }: ActionFunctionArgs) => {
    let formData = await request.formData()
    let response = { ok: false }
    switch (request.method.toLowerCase()) {
      case "put":
        // Create new folder
        const s = await SessionActions.addSession({
          group_id: formData.get("group_id") as string,
          workspace_id: formData.get("workspace_id") as string,
          folder_id: formData.get("folder_id") as string,
        })
        response.ok = true
        return redirect(`/conductor/${formData.get("workspace_id")}/${s.session.id}`)
      case "post":
        // Update folder
        break
      case "delete":
        // Delete folder
        await SessionActions.deleteSession({
          folder_id: formData.get("folder_id") as string,
          group_id: formData.get("group_id") as string,
          workspace_id: formData.get("workspace_id") as string,
          session_id: formData.get("session_id") as string,
        })
        response.ok = true
        break
    }
    return response
  },
}
