import { z } from "zod"
import { GroupS } from "@/data/schemas/workspace"
import { useEffect, useState } from "react"
import _ from "lodash"
import GroupsTree from "./tree"
import { AppStateT } from "@/data/loaders/app"
import { UserT } from "@/data/loaders/user"
import { useEvent } from "@/components/hooks/useEvent"
import { initLoaders } from "@/data/loaders"
import { mAppT } from "@/data/schemas/memory"
import useMemory from "@/components/hooks/useMemory"

type GroupT = z.infer<typeof GroupS>

export default function SessionOrganizer({ app_state, user_state }: { app_state: AppStateT; user_state: UserT }) {
  const mem_app: mAppT = useMemory({ id: "app" })
  const { workspace_id } = mem_app
  // const workspace_id = useParams().workspace_id as string
  const [groups, setGroups] = useState<GroupT[]>([])

  const updateGroups = async () => {
    const { UserState } = await initLoaders()
    await UserState.sync()
    const user_state = await UserState.get()
    const groups = _.find(user_state.workspaces, { id: workspace_id })?.groups
    if (!groups) return
    setGroups(groups)
  }

  useEffect(() => {
    updateGroups()
  }, [
    JSON.stringify([
      workspace_id,
      app_state.active_sessions[workspace_id],
      user_state.workspaces,
      app_state.open_sessions,
    ]),
  ])

  useEvent({
    name: [
      "sessions.addSession.done",
      "sessions.updateSession.done",
      "sessions.deleteSession.done",
      "app.changeActiveSession.done",
      "app.removeOpenSession.done",
      "workspace/change"
    ],
    action: updateGroups,
  })

  useEvent({
    name: "store/update",
    target: `user`,
    action: ({ session }: { session: any }) => {
      console.log("store/update", session)
      // if (name === session_id) {
      updateGroups()
      // }
    },
  })

  if (Object.keys(groups).length === 0) return <div className="flex flex-1">No groups</div>
  return <GroupsTree groups={groups} />
}
