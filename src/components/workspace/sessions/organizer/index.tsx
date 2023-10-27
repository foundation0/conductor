import { z } from "zod"
import { GroupS } from "@/data/schemas/workspace"
import { useEffect, useState } from "react"
import _ from "lodash"
import GroupsTree from "./tree"
import { AppStateT } from "@/data/loaders/app"
import { UserT } from "@/data/loaders/user"
import { useParams } from "react-router-dom"

type GroupT = z.infer<typeof GroupS>

export default function SessionOrganizer({ app_state, user_state }: { app_state: AppStateT; user_state: UserT }) {
  const workspace_id = useParams().workspace_id as string
  const [groups, setGroups] = useState<GroupT[]>([])

  const updateGroups = () => {
    const groups = _.find(user_state.workspaces, { id: workspace_id })?.groups
    if (!groups) return
    setGroups(groups)
  }

  useEffect(updateGroups, [
    JSON.stringify([workspace_id, app_state.active_sessions[workspace_id], user_state.workspaces, app_state.open_sessions]),
  ])

  if (Object.keys(groups).length === 0) return <div className="flex flex-1">No groups</div>
  return <GroupsTree groups={groups} />
}
