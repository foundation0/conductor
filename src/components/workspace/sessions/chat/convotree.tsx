import React, { ReactElement } from "react"
import { TextMessageT } from "@/data/loaders/sessions"
import Message from "./message"
import _ from "lodash"
import { RiAddCircleFill } from "react-icons/ri"

type MessageRowT = [TextMessageT[], TextMessageT, TextMessageT[]]

type ConversationTreeProps = {
  onNewBranchClick: (parent_id: string) => void
  onBranchClick: (msg_id: string) => void
  rows: MessageRowT[] | undefined
  participants: { [key: string]: ReactElement }
}

const ConversationTree: React.FC<ConversationTreeProps> = ({ onNewBranchClick, onBranchClick, rows, participants }) => {
  if (!rows) {
    return null
  }

  return (
    <div className="flex flex-col gap-6 px-4">
      {rows.map((row, index) => {
        return (
          <div key={index} className="flex flex-grow-1">
            <div className="flex flex-shrink mr-2">
              <div className="flex">
                <div className="avatar placeholder">
                  <div className="bg-neutral-focus text-neutral-content rounded w-8 h-8">
                    <span className="text-sm">
                      {row[1].type === "human" ? participants["user"] : participants[row[1].source || "AI"]}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className={`flex flex-grow-1 ${row[2].length > 0 ? "flex-shrink-0" : ""}`}>
              <Message message={row[1]} isActive={true} onClick={() => {}} />
            </div>
            <div className="flex flex-nowrap flex-row items-center gap-2">
              {row[1].parent_id !== "first" && row[1].type === "human" ? (
                <div
                  className="p-0 ml-1 mr-4 cursor-pointer flex h-full justify-center items-center"
                  onClick={() => {
                    onNewBranchClick(row[1].parent_id)
                  }}
                >
                  <RiAddCircleFill className="text-zinc-500 hover:text-zinc-100" />
                </div>
              ) : null}
              {row[2].map((msg) => {
                if (msg.hash === "1337") return null
                return (
                  <Message
                    key={msg.id}
                    message={msg}
                    isActive={false}
                    onClick={() => {
                      onBranchClick(msg.id)
                    }}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ConversationTree
