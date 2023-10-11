import _ from "lodash"
import Session from "./session"
import Tabs from "./tabs"
import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import Members from "@/components/workspace/members"
import Notepad from "@/components/workspace/notepad"
import AppstateActions from "@/data/actions/app"
import { Resizable } from "react-resizable"
import "react-resizable/css/styles.css"
import eventEmitter from "@/libraries/events"
import { Match, Switch } from "react-solid-flow"

export default function Workspace() {
  const session_id = useParams().session_id
  const { setPreference, getPreference } = AppstateActions
  const [open_sidebar, setOpenSidebar] = useState<string>("")
  const [notepadWidth, setNotepadWidth] = useState(400)

  useEffect(() => {
    getPreference({ key: "notepad-width" }).then((width) => {
      if (width) {
        const w = _.toNumber(width)
        setNotepadWidth(w)
      }
    })
  }, [])

  const onResize = (event: any, { size }: any) => {
    setNotepadWidth(size.width)
    eventEmitter.emit("layout_resize")
    // setPreference({ key: 'notepad-width', value: size.width });
  }

  function setSidebar(sidebar: string) {
    setTimeout(() => eventEmitter.emit("layout_resize"), 200)
    if (open_sidebar === sidebar) return setOpenSidebar("")
    setOpenSidebar(sidebar)
  }

  return (
    <div className="flex flex-1">
      <div id="ContentTabs" className="flex flex-1 gap-1 grow flex-col overflow-hidden">
        <div id="Tabs" className="flex flex-row bg-zinc-800 h-10 border-b-zinc-950 rounded-md">
          <Tabs setShowNotepad={() => setSidebar("Notepad")} setShowMembers={() => setSidebar("Members")} />
        </div>
        <div id="ContentViews" className="flex flex-1">
          {session_id ? <Session session_id={session_id} /> : null}
        </div>
      </div>
      <Resizable
        width={notepadWidth}
        height={1000}
        onResize={onResize}
        resizeHandles={["w"]}
        onResizeStop={() => {
          setPreference({ key: "notepad-width", value: notepadWidth })
        }}
      >
        <div
          id={open_sidebar || "SidebarHidden"}
          className={`flex ${open_sidebar !== "" ? "rounded-md ml-1 mb-1 overflow-hidden" : "hidden"}`}
          style={{ width: `${notepadWidth}px` }}
        >
          <Switch>
            <Match when={open_sidebar === "Notepad"}>
              <Notepad />
            </Match>
            <Match when={open_sidebar === "Members"}>
              <Members />
            </Match>
          </Switch>
        </div>
      </Resizable>
    </div>
  )
}
