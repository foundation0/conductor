import Chat from "@/components/workspace/sessions/chat"
import { emit } from "@/libraries/events"
import { useEffect, useState } from "react"
import { Resizable } from "react-resizable"
import { useParams } from "react-router-dom"
import { Match, Switch } from "react-solid-flow"
import Notepad from "../notepad"
import { useEvent } from "@/components/hooks/useEvent"
import AppstateActions from "@/data/actions/app"
import _ from "lodash"
import useMemory from "@/components/hooks/useMemory"

export default function Session({
  workspace_id,
  session_id,
  type = "chat",
  activated = false,
}: {
  workspace_id: string
  session_id: string
  type?: string
  activated?: boolean
}) {
  if (!session_id) return null
  if (!activated) return null
  const mem = useMemory<{ open_sidebar: string }>({ id: `${session_id}-open_sidebar`, state: { open_sidebar: "" } })
  const [notepadWidth, setNotepadWidth] = useState(400)
  // const [open_sidebar, setOpenSidebar] = useState<string>("")
  const { setPreference, getPreference } = AppstateActions
  const [sid, setSid] = useState<string>(session_id)

  const onResize = (event: any, { size }: any) => {
    setNotepadWidth(size.width)
    emit({
      type: "layout_resize",
    })
    setPreference({ key: "notepad-width", value: size.width })
  }

  useEffect(() => {
    getPreference({ key: "notepad-width" }).then((width: string) => {
      if (width) {
        const w = _.toNumber(width)
        setNotepadWidth(w)
      }
    })
  }, [])

  useEvent({
    name: "notepad/toggle",
    target: sid,
    action: function () {
      console.log("toggle notepad", session_id)
      if (mem.open_sidebar === "Notepad") {
        // setOpenSidebar("")
        mem.open_sidebar = ""
      } else {
        // setOpenSidebar("Notepad")
        mem.open_sidebar = "Notepad"
      }
    },
  })
  return (
    <div className={`flex flex-1 flex-row ${session_id !== (useParams().session_id as string) && "hidden"}`}>
      <div
        className={`flex flex-1 rounded-md mb-1 bg-zinc-900 bg-gradient-to-br from-zinc-800/30 to-zinc-700/30 justify-center`}
      >
        <Switch>
          <Match when={type === "chat"}>
            <Chat session_id={session_id} workspace_id={workspace_id} />
          </Match>
          <Match when={type === "data"}>
            <div>data ${session_id}</div>
          </Match>
        </Switch>
      </div>
      {mem.open_sidebar !== "" && (
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
            id={mem.open_sidebar || "SidebarHidden"}
            className={`flex ${mem.open_sidebar !== "" ? "rounded-md ml-1 mb-1 overflow-hidden" : "hidden"}`}
            style={{ width: `${notepadWidth}px` }}
          >
            <Switch>
              <Match when={mem.open_sidebar === "Notepad"}>
                <Notepad />
              </Match>
            </Switch>
          </div>
        </Resizable>
      )}
    </div>
  )
}
