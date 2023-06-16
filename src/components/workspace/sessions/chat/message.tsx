import React, { useEffect, useState } from "react"
import { TextMessageT } from "@/data/loaders/sessions"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import rehypeRaw from "rehype-raw"
import useClipboardApi from "use-clipboard-api"
import { MdCheck, MdContentCopy, MdInbox } from "react-icons/md"
import { useNavigate, useParams } from "react-router-dom"
import ClipboardActions from "@/data/actions/clipboard"
import * as Selection from "selection-popover"
import * as Toolbar from "@radix-ui/react-toolbar"

type MessageProps = {
  message: TextMessageT
  isActive: boolean
  onClick: () => void
}

const Message: React.FC<MessageProps> = ({ message, isActive, onClick }) => {
  const navigate = useNavigate()
  const workspace_id = useParams().workspace_id
  const session_id = useParams().session_id

  const [selection_open, setSelectionOpen] = useState(false)

  const [value, copy] = useClipboardApi()
  const [inbox, setInbox] = useState(false)

  const selector_delay = 1000

  function closeSelection() {
    copy("")
    window?.getSelection()?.empty()
    setSelectionOpen(false)
    setInbox(false)
  }

  useEffect(() => {
    if (value) setTimeout(closeSelection, selector_delay)
  }, [value])

  const addToClipboard = async ({ text, msg_id }: { text: string; msg_id: string }) => {
    if (text && msg_id && session_id) {
      await ClipboardActions.add({ session_id, data: text, msg_id, type: "text" })
      setTimeout(closeSelection, selector_delay)
      if (workspace_id) navigate(`/conductor/${workspace_id}/${session_id}`)
    }
  }

  return (
    <Selection.Root open={selection_open} onOpenChange={setSelectionOpen}>
      <Selection.Trigger>
        <div
          className={`chat flex flex-col border border-zinc-900 py-2 px-4 text-sm rounded-lg justify-start items-start ${
            isActive
              ? " text-white"
              : "bg-zinc-800 text-zinc-100 text-xs h-fit hover:bg-zinc-700 border-zinc-700 cursor-pointer"
          } ${message.type === "ai" ? "bg-zinc-800" : "border-zinc-800 bg-zinc-800 text-zinc-300"}
          ${message.hash === "1337" ? "italic text-xs" : ""}`}
          onClick={() => {
            if (!isActive) {
              onClick()
            }
          }}
        >
          <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeHighlight]}>{`${message.text} ${
            message.id === "temp" ? "▮" : ""
          }`}</ReactMarkdown>
        </div>
      </Selection.Trigger>
      <Selection.Portal>
        <Selection.Content>
          <Toolbar.Root className="flex p-[10px] w-full min-w-max rounded-md bg-zinc-800 border border-zinc-600 text-zinc-300 shadow-lg shadow-zinc-900">
            <Toolbar.ToggleGroup type="multiple">
              <Toolbar.ToggleItem
                className="flex-shrink-0 flex-grow-0 basis-auto h-3 px-2 rounded inline-flex leading-none items-center justify-center ml-0.5 outline-none focus:outline-none active:outline-none focus:relative first:ml-0 text-xs cursor-pointer hover:text-zinc-200"
                value="copy"
              >
                {value ? (
                  <MdCheck />
                ) : (
                  <div className="tooltip tooltip-top" data-tip="Copy to clipboard">
                    <MdContentCopy
                      className="h-3.5 w-3.5"
                      onClick={() => {
                        copy(window?.getSelection()?.toString() || "")
                      }}
                    />
                  </div>
                )}
              </Toolbar.ToggleItem>
              <Toolbar.ToggleItem
                className="flex-shrink-0 flex-grow-0 basis-auto h-3 px-2 rounded inline-flex leading-none items-center justify-center ml-0.5 outline-none focus:outline-none active:outline-none focus:relative first:ml-0 text-xs cursor-pointer hover:text-zinc-200"
                value="inbox"
              >
                {inbox ? (
                  <MdCheck />
                ) : (
                  <div className="tooltip tooltip-top" data-tip="Save to inbox">
                    <MdInbox
                      className="h-3.5 w-3.5"
                      onClick={() => {
                        setInbox(true)
                        addToClipboard({ text: window?.getSelection()?.toString() || "", msg_id: message.id })
                      }}
                    />
                  </div>
                )}
              </Toolbar.ToggleItem>
            </Toolbar.ToggleGroup>
          </Toolbar.Root>
          <Selection.Arrow className="fill-zinc-600 border-zinc-600" />
        </Selection.Content>
      </Selection.Portal>
    </Selection.Root>
  )
}

export default Message
