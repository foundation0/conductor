import WorkspaceSelector from "@/components/workspace/selector"
import { Outlet, useLoaderData } from "react-router-dom"
import PromptIcon from "@/assets/prompt.svg"
import { useLocation } from "react-router-dom"
import _ from "lodash"
import { AppStateT } from "@/data/loaders/app"
import { UserT } from "@/data/loaders/user"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { RiHashtag } from "react-icons/ri"
import { useAuth } from "../hooks/useAuth"
import { setActiveUser } from "../libraries/active_user"

export default function Conductor() {
  const location = useLocation()
  const auth = useAuth()

  useEffect(() => {
    if (auth?.user) {
      setActiveUser(auth?.user)
    }
  }, [location.pathname])

  const { app_state, user_state } = useLoaderData() as { app_state: AppStateT; user_state: UserT }
  const [active_sessions_elements, setActiveSessionsElements] = useState<any>([])

  useEffect(() => {
    setActiveSessionsElements(
      _.keys(app_state.active_sessions).map((key) => {
        const sess = app_state.active_sessions[key]
        const workspace = _.find(user_state.workspaces, { id: sess.workspace_id })
        const group = workspace?.groups?.find((g) => g.id === sess.group_id)
        const folder = group?.folders?.find((f) => f.id === sess.folder_id)
        const session = folder?.sessions?.find((s) => s.id === sess.session_id) ?? null
        return (
          <Link key={sess.session_id} to={`/conductor/${workspace?.id}/${session?.id}`}>
            <div className="flex flex-row gap-2 border-t border-t-zinc-700 py-2 pl-2 pr-4 text-sm rounded-lg border-zinc-800 bg-zinc-800 hover:bg-zinc-800/70 text-zinc-300">
              <div className="flex flex-shrink">
                <img src={workspace?.icon} className="w-10 h-10" />
              </div>
              <div className="flex flex-1 items-center text-sm">
                <RiHashtag className={`w-3.5 h-3.5`} />
                <div className="pb-0.5">{session?.name}</div>
              </div>
            </div>
          </Link>
        )
      })
    )
  }, [JSON.stringify([app_state.active_sessions])])

  return (
    <main className={`flex flex-row flex-1 m-0 p-0 dark h-full bg-zinc-900/70`}>
      <div id="WorkspaceSelector" className="flex flex-shrink bg-zinc-900">
        <WorkspaceSelector />
      </div>
      <div id="WorkspaceView" className="flex flex-1">
        {location.pathname !== "/conductor/" ? (
          <Outlet />
        ) : (
          <div className="flex justify-center items-center w-full">
            <div>
              <div className="flex justify-center items-center w-full">
                <img src={PromptIcon} className="w-48 h-48 opacity-10" />
              </div>
              <div className="text-center text-2xl font-semibold text-zinc-200">Welcome to Prompt</div>
              <div className="mt-6 text-center text-md font-semibold text-zinc-400 mb-2">
                Continue where you left off
              </div>
              {active_sessions_elements}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
