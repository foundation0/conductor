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
import { initLoaders } from "@/data/loaders"
import { SessionT, WorkspaceT } from "@/data/schemas/workspace"

export default function Workspace() {
  const workspace_id = useParams().workspace_id as string
  const session_id = useParams().session_id as string
  const { setPreference, getPreference } = AppstateActions
  const [open_sidebar, setOpenSidebar] = useState<string>("")
  const [notepadWidth, setNotepadWidth] = useState(400)
  const [sessions, setSessions] = useState<SessionT[]>([])

  async function updateSessions() {
    const { AppState, SessionState, UserState, AIState } = await initLoaders()
    const user_state = await UserState.get()
    // get all the sessions for this workspace
    const workspace: WorkspaceT = _.find(user_state.workspaces, { id: workspace_id })
    if (!workspace) return
    // recursively fetch all the sessions from workspace.groups.folders.sessions
    const sessions = _(workspace.groups)
      .flatMap((group) => {
        return _.flatMap(group.folders, (folder) => {
          return folder.sessions
        })
      })
      .compact()
      .value()
    if (sessions) setSessions(sessions)
  }

  useEffect(() => {
    updateSessions()
  }, [JSON.stringify([workspace_id, session_id])])

  useEffect(() => {
    getPreference({ key: "notepad-width" }).then((width: string) => {
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
          {sessions.map((session) => {
            return (
              <Session
                key={session.id}
                workspace_id={workspace_id}
                session_id={session.id}
                type={"chat"}
                active={session.id === session_id}
              />
            )
          })}
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
