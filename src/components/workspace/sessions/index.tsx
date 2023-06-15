import _ from "lodash"
import Session from "./session"
import Tabs from "./tabs"
import { useParams } from "react-router-dom"
import { useState } from "react"
import Members from "@/components/workspace/members"
import Clipboard from "@/components/workspace/clipboard"

export default function Workspace() {
  const session_id = useParams().session_id

  const [open_sidebar, setOpenSidebar] = useState<boolean | string>(false)

  function setSidebar(sidebar: string) {
    if (open_sidebar === sidebar) return setOpenSidebar(false)
    setOpenSidebar(sidebar)
  }

  return (
    <div className="flex flex-1">
      <div id="ContentTabs" className="flex flex-1 grow flex-col">
        <div id="Tabs" className="flex flex-row bg-zinc-800 h-10 border-b-zinc-950">
          <Tabs setShowClipboard={() => setSidebar("clipboard")} setShowMembers={() => setSidebar("members")} />
        </div>
        <div id="ContentViews" className="flex flex-1">
          {session_id ? <Session session_id={session_id} /> : null}
        </div>
      </div>
      <div id="Clipboard" className={`flex w-1/3 ${open_sidebar === "clipboard" ? "" : "hidden"}`}>
        <Clipboard />
      </div>
      <div id="Members" className={`flex flex-shrink ${open_sidebar === "members" ? "" : "hidden"}`}>
        <Members />
      </div>
    </div>
  )
}
