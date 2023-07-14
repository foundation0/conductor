import _ from "lodash"
import Session from "./session"
import Tabs from "./tabs"
import { useParams } from "react-router-dom"
import { useState } from "react"
import Members from "@/components/workspace/members"
import Notepad from "@/components/workspace/notepad"

export default function Workspace() {
  const session_id = useParams().session_id

  const [open_sidebar, setOpenSidebar] = useState<boolean | string>(false)

  function setSidebar(sidebar: string) {
    if (open_sidebar === sidebar) return setOpenSidebar(false)
    setOpenSidebar(sidebar)
  }

  return (
    <div className="flex flex-1">
      <div id="ContentTabs" className="flex flex-1 grow flex-col overflow-hidden">
        <div id="Tabs" className="flex flex-row bg-zinc-800 h-10 border-b-zinc-950">
          <Tabs setShowNotepad={() => setSidebar("notepad")} setShowMembers={() => setSidebar("members")} />
        </div>
        <div id="ContentViews" className="flex flex-1">
          {session_id ? <Session session_id={session_id} /> : null}
        </div>
      </div>
      <div id="Notepad" className={`flex w-[400px] ${open_sidebar === "notepad" ? "" : "hidden"}`}>
        <Notepad />
      </div>
      <div id="Members" className={`flex flex-shrink ${open_sidebar === "members" ? "" : "hidden"}`}>
        <Members />
      </div>
    </div>
  )
}
