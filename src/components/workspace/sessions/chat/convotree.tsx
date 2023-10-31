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
import { emit } from "@/libraries/events"
dayjs.extend(relativeTime)

type MessageRowT = [TextMessageT[], TextMessageT, TextMessageT[]]

type ConversationTreeProps = {
  onNewBranchClick?: (parent_id: string) => void
  onBranchClick?: (msg_id: string) => void
  rows: MessageRowT[] | undefined
  participants: { [key: string]: ReactElement }
  paddingBottom: number
  msgs_in_mem?: string[]
  ai: AIsT[0]
  module: ModuleT
  gen_in_progress?: boolean
}

const ConversationTree: React.FC<ConversationTreeProps> = ({
  onNewBranchClick,
  onBranchClick,
  rows,
  participants,
  paddingBottom,
  msgs_in_mem,
  ai,
  module,
  gen_in_progress,
}) => {
  if (!rows) {
    return null
  }

  const { ai_state, user_state } = useLoaderData() as { ai_state: AIsT; user_state: UserT }
  const [ago_refresh, setAgoRefresh] = useState(1)
  const session_id = useParams<{ session_id: string }>().session_id

  useEffect(() => {
    const interval = setInterval(() => setAgoRefresh(ago_refresh + 1), 60000)
    return () => clearInterval(interval)
  }, [session_id])

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
                    className={`Message flex ${row[1].type === "human" ? "flex-row" : "flex-col"} flex-grow-1  ${
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
                    {row[1].parent_id !== "first" && row[1].type === "human" && onNewBranchClick ? (
                      <div
                        className="p-0 ml-1 mr-4 cursor-pointer flex h-full justify-center items-center"
                        onClick={() => {
                          if (onNewBranchClick) onNewBranchClick(row[1].parent_id)
                          fieldFocus({ selector: "#input" })
                        }}
                      >
                        <div className="tooltip tooltip-top" data-tip="Start a new branch">
                          <RiAddCircleFill className="text-zinc-500 hover:text-zinc-100 transition-all" />
                        </div>
                      </div>
                    ) : null}
                    {_.last(rows)?.[1].type === "ai" && _.last(rows)?.[1].id === row[1].id && !gen_in_progress && (
                      <div className="flex flex-1 justify-end text-xs text-zinc-500 hover:text-zinc-100 cursor-pointer transition-all mr-1">
                        <div
                          onClick={() => {
                            emit({
                              type: "sessions/add_message",
                              data: {
                                session_id,
                                bid: row[1].id,
                                meta: {
                                  role: "continue",
                                },
                                message: "continue",
                              },
                            })
                          }}
                        >
                          continue...
                        </div>
                      </div>
                    )}
                  </div>
                  <div
                    className={`flex flex-nowrap flex-col items-start gap-2 branch ${row[2].length > 0 ? "w-1/3" : ""}`}
                  >
                    {row[2].map((msg) => {
                      if (msg.hash === "1337" || !onBranchClick) return null
                      return (
                        <div key={msg.id} className="tooltip tooltip-top" data-tip={msg.text}>
                          <Message
                            message={msg}
                            isActive={false}
                            onClick={() => {
                              if (onBranchClick) onBranchClick(msg.id)
                              fieldFocus({ selector: "#input" })
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
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
