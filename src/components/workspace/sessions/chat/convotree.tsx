import React, { JSXElementConstructor, ReactElement, useEffect, useState } from "react"
import { TextMessageT } from "@/data/loaders/sessions"
import Message from "./message"
import _ from "lodash"
import { RiAddCircleFill } from "react-icons/ri"
import { fieldFocus } from "@/libraries/field_focus"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { useLoaderData, useParams } from "react-router-dom"
import { AIsT } from "@/data/schemas/ai"
import { UserT } from "@/data/loaders/user"
import { ModuleT } from "@/data/schemas/modules"
import { getAvatar } from "@/libraries/ai"
import { useEvent } from "@/components/hooks/useEvent"
import { emit, query } from "@/libraries/events"
import { FaUser } from "react-icons/fa"
import { Module } from "@/modules"
import { ChatSessionT } from "@/data/schemas/sessions"
import { error } from "@/libraries/logging"
import { buildMessageTree, computeActivePath } from "../../../../libraries/branching"
import { RxCornerBottomLeft } from "react-icons/rx"
import { LuGitBranchPlus } from "react-icons/lu"
dayjs.extend(relativeTime)

type MessageRowT = [TextMessageT[], TextMessageT, TextMessageT[]]

type ConversationTreeProps = {
  rows: MessageRowT[] | undefined
  paddingBottom: number
  msgs_in_mem?: string[]
  ai: AIsT[0]
  gen_in_progress?: boolean
  session_id: string
}

const ConversationTree: React.FC<ConversationTreeProps> = ({
  rows,
  paddingBottom,
  msgs_in_mem,
  ai,
  gen_in_progress,
  session_id,
}) => {
  if (!rows) {
    return null
  }

  const { ai_state, user_state } = useLoaderData() as { ai_state: AIsT; user_state: UserT }
  const [ago_refresh, setAgoRefresh] = useState(1)
  const [session, setSession] = useState<ChatSessionT | undefined>(undefined)

  // setup participants
  const [participants, setParticipants] = useState<{ [key: string]: React.ReactElement }>({
    user: <FaUser />,
    AI: <FaUser />,
  })

  async function updateParticipants({ session, messages }: { session: ChatSessionT; messages: MessageRowT[] }) {
    if (!session) return error({ message: "No session" })
    // const { UserState, SessionsState } = await initLoaders()
    // const user_state = await UserState()
    const module: { specs: ModuleT; main: Function } | any = await Module(session.settings.module.id)

    // Update participants
    const p: { [key: string]: React.ReactElement } = {
      user: <FaUser />,
      AI: <FaUser />,
    }
    if (!messages) return null
    /* emit({
      type: "chat/processRawMessages",
      data: {
        target: session_id
      }
    }) */
    if (!module) return error({ message: "No module" })

    messages.forEach((ms) => {
      const m = ms[1]
      if (!m.source.match(/user/) && module.specs.id === m.source.replace("ai:", "").split("/")[0]) {
        const user_variant_settings = _.find(user_state.modules.installed, {
          id: module.specs.id,
        })?.meta?.variants?.find((v: any) => v.id === m.source.split("/")[1])
        const ai = _.find(ai_state, { id: m.source.split("/")[2] })
        let icon = ai?.meta.avatar || (
          <img
            className={`border-2 border-zinc-900 rounded-full w-3 h-3`}
            /* style={{ borderColor: user_variant_settings?.color || "#00000000" }} */
            src={getAvatar({ seed: _.find(ai_state, { id: m.source.split("/")[2] })?.meta?.name || "" })}
          />
        )

        p[ai?.id || module.specs.id] = icon ? (
          typeof icon === "string" ? (
            <img
              src={icon}
              className={`border-2 rounded-full w-3 h-3 bg-zinc-200`}
              style={{ borderColor: user_variant_settings?.color || "#00000000" }}
            />
          ) : (
            icon
          )
        ) : (
          <FaUser />
        )
      } else {
        p["user"] =
          _.size(user_state.meta?.profile_photos) > 0 ? (
            <img
              src={_.first(user_state.meta?.profile_photos) || ""}
              className="border-2 border-zinc-900/50 rounded-full w-3 h-3"
            />
          ) : (
            <div className="border-2 border-zinc-900/50 rounded-full w-3 h-3">
              {user_state.meta?.username?.[0].toUpperCase()}
            </div>
          )
      }
    })
    setParticipants(p)
  }

  useEvent({
    name: "chat/processed-messages",
    target: session_id,
    action: async (data: any) => {
      let ses = session
      if (!ses) {
        ses = await query<ChatSessionT>({
          type: "sessions.getById",
          data: {
            session_id,
          },
        })
      }
      updateParticipants({ ...data, session: ses })
    },
  })

  async function init() {
    const session = await query<ChatSessionT>({
      type: "sessions.getById",
      data: {
        session_id,
      },
    })
    setSession(session)
    const raw_messages = await query<TextMessageT[]>({
      type: "sessions.getMessagesBySessionId",
      data: {
        session_id,
      },
    })
    const active_path = computeActivePath(raw_messages || [])
    if (!active_path) return
    let rows = buildMessageTree({ messages: raw_messages || [], first_id: "first", activePath: active_path })
    if (!rows) return null
    updateParticipants({ session, messages: rows })
  }
  useEffect(() => {
    init()
    const interval = setInterval(() => setAgoRefresh(ago_refresh + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  // delay the appearance of the fake AI message
  const [show_loader_msg, setShowLoaderMsg] = useState(false)
  useEffect(() => {
    if (gen_in_progress) {
      setTimeout(() => setShowLoaderMsg(true), 1000)
    } else {
      setShowLoaderMsg(false)
    }
  }, [gen_in_progress])

  if (paddingBottom < 80) paddingBottom = 80
  return (
    <div className="flex flex-row justify-center px-6" style={{ paddingBottom: `${paddingBottom}px` }}>
      <div className="flex flex-col gap-6 min-w-[500px] w-full max-w-screen-lg">
        {rows
          .filter((r) => {
            // filter out the "continue" messages
            return r[1]?.meta?.role !== "continue"
          })
          .filter((r) => {
            // filter out deleted messages
            return r[1]?.status !== "deleted"
          })
          .map((row, index) => {
            let sender = ""
            let ai_image: ReactElement<any, string | JSXElementConstructor<any>> = <></>
            if (row[1].type === "human") sender = "You"
            else {
              const s = row[1].source.replace("ai:", "").split("/")
              const ai_name = _.find(ai_state, { id: s[2] })?.persona.name
              const module_name = _.find(user_state.modules.installed, { id: s[0] })?.meta.name
              const variant_name = _.find(user_state.modules.installed, { id: s[0] })?.meta?.variants?.find(
                (v) => v.id === s[1]
              )?.name
              sender = ai_name ? (module_name && variant_name ? `${ai_name} using ${variant_name}` : ai_name) : ``
              ai_image = participants[s[2] || s[0]]
            }
            return (
              <div key={index} className="flex flex-col flex-grow-1">
                <div className="ml-12 text-xs font-semibold text-zinc-600">
                  {sender}
                  {row[1].created_at && ago_refresh
                    ? " - " + dayjs().from(dayjs(row[1].created_at), true) + " ago"
                    : ""}
                </div>
                <div className="flex flex-row">
                  <div className="flex flex-shrink mr-2">
                    <div className="flex">
                      <div className="avatar placeholder">
                        <div className=" text-zinc-200 w-8 h-8 flex ">
                          <span className="text-sm w-full h-full flex justify-center items-center">
                            {row[1].type === "human" ? participants["user"] : ai_image}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`Message flex ${row[1].type === "human" ? "flex-col" : "flex-col"} gap-1 flex-grow-1  ${
                      row[2].length > 0 ? "max-w-2/3" : ""
                    }`}
                  >
                    <Message
                      message={row[1]}
                      isActive={true}
                      onClick={() => {}}
                      className={
                        row[1].hash !== "1337" && msgs_in_mem && msgs_in_mem?.length > 0
                          ? _.includes(msgs_in_mem, row[1].id)
                            ? ""
                            : "" // for sliding window memory: "bg-zinc-800 opacity-70 hover:opacity-100"
                          : "opacity-100"
                      }
                    />

                    {_.last(rows)?.[1].type === "ai" && _.last(rows)?.[1].id === row[1].id && !gen_in_progress && (
                      <div className="flex flex-1 justify-end text-xs text-zinc-500 hover:text-zinc-100 cursor-not-allowed transition-all mr-1">
                        <div className="tooltip tooltip-top" data-tip="Coming soon">
                          <div
                          /* onClick={() => {
                            emit({
                              type: "chat.send",
                              data: {
                                target: session_id,
                                session_id,
                                meta: {
                                  role: "continue",
                                },
                                message: "continue",
                              },
                            })
                          }} */
                          >
                            continue...
                          </div>
                        </div>
                      </div>
                    )}
                    {rows[_.findIndex(rows, (r) => r[1].id === row[1].id) + 1]?.[2]?.length > 0 &&
                      row[1].type === "ai" &&
                      rows[_.findIndex(rows, (r) => r[1].id === row[1].id) + 1][2].map((m) => {
                        if (m.hash === "1337") return null
                        return (
                          <div className="gap-1 p-0 ml-1 flex h-full justify-start align-start" key={`msg-${m.id}`}>
                            <Message
                              message={m}
                              isActive={false}
                              avatar={participants["user"]}
                              onClick={() => {
                                emit({
                                  type: "chat/branch-click",
                                  data: {
                                    msg_id: m.id,
                                    target: session_id,
                                  },
                                })
                                // fieldFocus({ selector: "#input" })
                              }}
                            />
                          </div>
                        )
                      })}
                    {row[1].parent_id !== "first" && row[1].type === "ai" && _.last(rows)?.[1].id !== row[1].id ? (
                      <div
                        className="gap-1 p-0 ml-1 cursor-pointer flex h-full justify-start align-start"
                        onClick={() => {
                          emit({
                            type: "chat/new-branch-click",
                            data: { parent_id: row[1].id, target: session_id },
                          })
                          fieldFocus({ selector: "#input" })
                        }}
                      >
                        <RxCornerBottomLeft className="w-3 h-3 text-zinc-700" />
                        <div className="flex flex-row gap-1 items-center text-xs text-zinc-500 hover:text-zinc-100 cursor-pointer transition-all">
                          {/* <RiAddCircleFill className="w-3 h-3" /> */}
                          <LuGitBranchPlus className="w-3 h-3" />
                          <div>Create new thread</div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div
                    className={`flex flex-nowrap flex-col items-start gap-2 branch ${row[2].length > 0 ? "w-1/3" : ""}`}
                  ></div>
                </div>
              </div>
            )
          })}
        {_.last(rows)?.[1].type === "human" && _.last(rows)?.[1].text && gen_in_progress && (
          <div className={`flex flex-col flex-grow-1 transition-all ${!show_loader_msg && "opacity-0"}`}>
            <div className="ml-12 text-xs font-semibold text-zinc-600">
              {ai.persona.name}
              {" - " + dayjs().from(dayjs(), true) + " ago"}
            </div>
            <div className="flex flex-row">
              <div className="flex flex-shrink mr-2">
                <div className="flex">
                  <div className="avatar placeholder">
                    <div className=" text-zinc-200 w-8 h-8 flex ">
                      <span className="text-sm w-full h-full flex justify-center items-center">
                        <img
                          className={`border-2 border-zinc-900 rounded-full w-3 h-3`}
                          src={getAvatar({ seed: ai?.meta?.name || "" })}
                        />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`Message flex flex-grow-1`}>
                <Message
                  message={{
                    id: "loader",
                    text: "thinking...",
                    status: "ready",
                    type: "ai" as const,
                    source: "ai:",
                    created_at: "",
                    parent_id: "first",
                    hash: "1337",
                    _v: 1,
                    version: "1.0",
                  }}
                  isActive={true}
                  onClick={() => {}}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConversationTree
