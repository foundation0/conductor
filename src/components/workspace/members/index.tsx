import { useLoaderData, useParams } from "react-router-dom"
import { UserT } from "@/data/loaders/user"
import _ from "lodash"

export default function Members() {
  const { user_state } = useLoaderData() as { user_state: UserT }
  const workspace_id = useParams().workspace_id

  function getMembers() {
    // fetch members from the workspace
    const ws_members = user_state.workspaces.find((ws) => ws.id === workspace_id)?.members || { read: [], write: [] }

    // fetch excluded members from group, folder and session
    const group_excluded =
      user_state.workspaces.find((ws) => ws.id === workspace_id)?.groups.flatMap((g) => g.excluded_members) || []
    const folder_excluded =
      user_state.workspaces
        .find((ws) => ws.id === workspace_id)
        ?.groups.flatMap((g) => g.folders.flatMap((f) => f.excluded_members)) || []
    const session_excluded =
      user_state.workspaces
        .find((ws) => ws.id === workspace_id)
        ?.groups.flatMap((g) => g.folders.flatMap((f) => f?.sessions?.flatMap((s) => s.excluded_members))) || []

    // remove excluded members from workspace members
    return _([
      ...ws_members.read,
      ...(ws_members.write || []),
      ...group_excluded,
      ...folder_excluded,
      ...session_excluded,
    ])
      .difference()
      .uniq()
      .compact()
      .value()
  }

  return (
    <div>
      Members
      {JSON.stringify(getMembers())}
    </div>
  )
}
