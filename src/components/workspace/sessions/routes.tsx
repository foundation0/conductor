import { ActionFunctionArgs, redirect } from "react-router-dom"
import Sessions from "."
import { loader } from "@/data/loaders"
import SessionActions from "@/data/actions/sessions"
import _ from "lodash"
import { emit } from "@/libraries/events"

export const SessionIdR = {
  path: ":session_id",
  element: <Sessions />,
  loader,
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
        emit({ type: "sessions/change", data: { session_id: s.session.id } })
        return redirect(`/c/${formData.get("workspace_id")}/${s.session.id}`)
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
