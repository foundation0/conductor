import React, { ReactElement } from "react"
import { TextMessageT } from "@/data/loaders/sessions"
import Message from "./message"
import _ from "lodash"
import { RiAddCircleFill } from "react-icons/ri"
import { fieldFocus } from "@/components/libraries/field_focus"
type MessageRowT = [TextMessageT[], TextMessageT, TextMessageT[]]

type ConversationTreeProps = {
  onNewBranchClick: (parent_id: string) => void
  onBranchClick: (msg_id: string) => void
  rows: MessageRowT[] | undefined
  participants: { [key: string]: ReactElement }
  paddingBottom: number
  msgs_in_mem?: string[]
}

const ConversationTree: React.FC<ConversationTreeProps> = ({
  onNewBranchClick,
  onBranchClick,
  rows,
  participants,
  paddingBottom,
  msgs_in_mem,
}) => {
  if (!rows) {
    return null
  }
  if (paddingBottom < 80) paddingBottom = 80
  return (
    <div className="flex flex-row px-4 justify-center" style={{ paddingBottom: `${paddingBottom}px` }}>
      <div className="flex flex-col gap-6 min-w-[500px] max-w-screen-lg">
        {rows.map((row, index) => {
          return (
            <div key={index} className="flex flex-grow-1">
              <div className="flex flex-shrink mr-2">
                <div className="flex">
                  <div className="avatar placeholder mt-1">
                    <div className="bg-zinc-800 text-zinc-200 rounded w-8 h-8 flex border-t border-zinc-700">
                      <span className="text-sm w-6 h-6 flex justify-center items-center">
                        {row[1].type === "human" ? participants["user"] : participants[row[1].source || "AI"]}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`Message flex flex-grow-1  ${row[2].length > 0 ? "max-w-2/3" : ""}`}>
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
                {row[1].parent_id !== "first" && row[1].type === "human" ? (
                  <div
                    className="p-0 ml-1 mr-4 cursor-pointer flex h-full justify-center items-center"
                    onClick={() => {
                      onNewBranchClick(row[1].parent_id)
                      fieldFocus({ selector: "#input" })
                    }}
                  >
                    <div className="tooltip tooltip-top" data-tip="Start a new branch">
                      <RiAddCircleFill className="text-zinc-500 hover:text-zinc-100" />
                    </div>
                  </div>
                ) : null}
              </div>
              <div className={`flex flex-nowrap flex-col items-start gap-2 branch ${row[2].length > 0 ? "w-1/3" : ""}`}>
                {row[2].map((msg) => {
                  if (msg.hash === "1337") return null
                  return (
                    <div key={msg.id} className="tooltip tooltip-top" data-tip={msg.text}>
                      <Message
                        message={msg}
                        isActive={false}
                        onClick={() => {
                          onBranchClick(msg.id)
                          fieldFocus({ selector: "#input" })
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ConversationTree
