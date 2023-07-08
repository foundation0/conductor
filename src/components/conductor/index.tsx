import WorkspaceSelector from "@/components/workspace/selector"
import { Outlet } from "react-router-dom"
import PromptIcon from "@/assets/prompt.svg"
import { useLocation } from "react-router-dom"
import _ from "lodash"
import { useAuth } from "../hooks/useAuth"
import { useEffect } from "react"
import { setActiveUser } from "../libraries/active_user"

export default function Conductor() {
  const location = useLocation()
  const auth = useAuth()
  
  useEffect(() => {
    if (auth?.user) {
      setActiveUser(auth?.user)
    }
  }, [location.pathname])

  return (
    <main className={`flex flex-row flex-1 m-0 p-0 dark h-full bg-zinc-900`}>
      <div id="WorkspaceSelector" className="flex flex-shrink bg-zinc-900">
        <WorkspaceSelector />
      </div>
      <div id="WorkspaceView" className="flex flex-1">
        {location.pathname !== "/conductor/" ? (
          <Outlet />
        ) : (
          <div className="flex justify-center items-center w-full">
            <div>
              {" "}
              <img src={PromptIcon} className="w-12 h-12 text-zinc-500 opacity-50" />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
