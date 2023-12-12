import Chat from "@/components/workspace/sessions/chat"
import { emit } from "@/libraries/events"
import { useEffect, useState } from "react"
import { Resizable } from "react-resizable"
import { useLoaderData, useParams } from "react-router-dom"
import { Match, Switch } from "react-solid-flow"
import Notepad from "./notepad"
import Settings from "./settings"
import { useEvent } from "@/components/hooks/useEvent"
import AppstateActions from "@/data/actions/app"
import _ from "lodash"
import useMemory from "@/components/hooks/useMemory"
import { mChatSessionT } from "@/data/schemas/memory"
import { SessionsT } from "@/data/schemas/sessions"

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
  const { sessions_state } = useLoaderData() as {
    sessions_state: SessionsT
  }
  const mem_session = useMemory<mChatSessionT>({
    id: `session-${session_id}`,
    state: {
      id: session_id,
      session: sessions_state.active[session_id],
      module: undefined,
      module_ctx_len: 0,
      input: { change_timer: null, text: "", tokens: 0 },
      context: {
        data_refs: [],
        tokens: 0,
      },
      messages: {
        raw: [],
        active: [],
        branch_msg_id: "",
        branch_parent_id: "",
        tokens: 0,
      },
      generation: {
        in_progress: false,
        controller: undefined,
        msgs_in_mem: [],
        msg_update_ts: 0,
      },
    },
  })
  const { session } = mem_session
  const mem = useMemory<{
    open_sidebar: string
    debounce: any
    sidebar_width: number
    sid: string
  }>({
    id: `session-${session_id}-sidebar`,
    state: { open_sidebar: "", sidebar_width: 400, sid: session_id },
  })

  const { setPreference, getPreference } = AppstateActions
  const { sid, sidebar_width } = mem

  const onResize = (event: any, { size }: any) => {
    mem.sidebar_width = size.width >= 250 ? size.width : 250
    emit({
      type: "layout_resize",
    })
    setPreference({ key: "notepad-width", value: mem.sidebar_width })
  }

  useEffect(() => {
    getPreference({ key: "notepad-width" }).then((width: string) => {
      if (width) {
        const w = _.toNumber(width)
        mem.sidebar_width = w
      }
    })
  }, [])

  function debounce() {
    mem.debounce = true
    setTimeout(() => {
      mem.debounce = false
    }, 1000)
  }

  useEvent({
    name: "notepad/toggle",
    target: sid,
    action: function () {
      // console.log("toggle notepad", session_id)
      if (!mem.debounce && mem.open_sidebar === "Notepad") {
        mem.open_sidebar = ""
      } else if (!mem.debounce) {
        mem.open_sidebar = "Notepad"
      }
      debounce()
    },
  })

  useEvent({
    name: "settings/toggle",
    target: sid,
    action: function () {
      // console.log("toggle settings", session_id)
      if (!mem.debounce && mem.open_sidebar === "Settings") {
        mem.open_sidebar = ""
      } else if (!mem.debounce) {
        mem.open_sidebar = "Settings"
      }
      debounce()
    },
  })

  useEvent({
    name: "session/calculateTokens",
    target: sid,
    action: async () => {},
  })
  return (
    <div
      className={`flex flex-1 flex-row ${
        session_id !== (useParams().session_id as string) && "hidden"
      }`}
    >
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
          width={sidebar_width}
          height={1000}
          onResize={onResize}
          resizeHandles={["w"]}
          onResizeStop={() => {
            setPreference({ key: "notepad-width", value: sidebar_width })
          }}
        >
          <div
            id={mem.open_sidebar || "SidebarHidden"}
            className={`flex ${
              mem.open_sidebar !== "" ?
                "rounded-md ml-1 mb-1 overflow-hidden"
              : "hidden"
            }`}
            style={{ width: `${sidebar_width}px` }}
          >
            <Switch>
              <Match when={mem.open_sidebar === "Notepad"}>
                <Notepad />
              </Match>
              <Match when={mem.open_sidebar === "Settings"}>
                <Settings session_id={session.id} />
              </Match>
            </Switch>
          </div>
        </Resizable>
      )}
    </div>
  )
}
