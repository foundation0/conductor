import React, { useEffect, useState } from "react"
import { TextMessageT } from "@/data/loaders/sessions"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import rehypeRaw from "rehype-raw"
import { MdCheck, MdContentCopy, MdInbox } from "react-icons/md"
import { useNavigate, useParams } from "react-router-dom"
import ClipboardActions from "@/data/actions/clipboard"
import * as Selection from "selection-popover"
import * as Toolbar from "@radix-ui/react-toolbar"
import { error } from "@/components/libraries/logging"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { createHash } from "@/security/common"

type MessageProps = {
  message: TextMessageT
  isActive: boolean
  onClick: () => void
  className?: string
}

const Message: React.FC<MessageProps> = ({ message, isActive, onClick, className }) => {
  const navigate = useNavigate()
  const workspace_id = useParams().workspace_id
  const session_id = useParams().session_id

  const [selection_open, setSelectionOpen] = useState(false)

  const [used_icon_id, setUsedIcon] = useState("")
  const [inbox, setInbox] = useState(false)

  const [isHovering, setIsHovering] = useState(false)

  const handleMouseHover = () => {
    setIsHovering(!isHovering)
  }

  const selector_delay = 1000

  function closeSelection() {
    setUsedIcon("")
    // window?.getSelection()?.empty()
    setSelectionOpen(false)
    setInbox(false)
  }

  const copyToClipboard = async (text: string, id?: string) => {
    if (!navigator.clipboard) {
      console.error("Clipboard API not available")
      return
    }

    try {
      const permission = await navigator.permissions.query({ name: "clipboard-write" as any })
      if (permission.state === "granted" || permission.state === "prompt") {
        await navigator.clipboard.writeText(text)
        if (id) setUsedIcon(id)
      } else {
        error({ message: "Clipboard permission denied" })
      }
    } catch (err) {
      error({ message: "Copy failed", data: err })
    }
  }

  useEffect(() => {
    if (used_icon_id) setTimeout(closeSelection, selector_delay)
  }, [used_icon_id])

  const addToClipboard = async ({ text, msg_id, icon_id }: { text: string; msg_id: string; icon_id?: string }) => {
    if (text && msg_id && session_id) {
      if (icon_id) setUsedIcon(icon_id)
      await ClipboardActions.add({ session_id, data: text, msg_id, type: "text" })
      setTimeout(closeSelection, selector_delay)
      if (workspace_id) navigate(`/conductor/${workspace_id}/${session_id}`)
    }
  }

  return (
    <Selection.Root open={selection_open} onOpenChange={setSelectionOpen}>
      <Selection.Trigger className="flex">
        <div
          onMouseEnter={handleMouseHover}
          onMouseLeave={handleMouseHover}
          className={`chat flex flex-col border-t border-t-zinc-700 py-2 px-4 text-sm rounded-lg justify-center items-start relative ${
            isActive
              ? " text-white"
              : "bg-zinc-800 text-zinc-100 text-xs h-fit hover:bg-zinc-700 border-zinc-700 cursor-pointer overflow-x-hidden"
          } ${message.type === "ai" ? "bg-zinc-800" : "border-zinc-800 bg-zinc-800 text-zinc-300"}
          ${className} ${message.hash === "1337" ? "italic text-xs opacity-100" : ""}`}
          onClick={() => {
            if (!isActive) {
              onClick()
            }
          }}
        >
          {isHovering && isActive && (
            <div className="flex gap-2 border-t border-t-zinc-700 bg-zinc-800 absolute right-2 -top-7 text-xs overflow-visible whitespace-nowrap py-2 px-3 rounded mt-2">
              <div className="tooltip-left tooltip" data-tip="Copy message to clipboard">
                {used_icon_id === message.id + "all/copy" ? (
                  <MdCheck />
                ) : (
                  <MdContentCopy
                    className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                    onClick={() => {
                      copyToClipboard(message.text, message.id + "all/copy")
                    }}
                  />
                )}
              </div>
              <div className="tooltip tooltip-top" data-tip="Save to inbox">
                {used_icon_id === message.id + "all/clip" ? (
                  <MdCheck />
                ) : (
                  <MdInbox
                    className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                    onClick={() => {
                      setInbox(true)
                      addToClipboard({ text: message.text || "", msg_id: message.id, icon_id: message.id + "all/clip" })
                    }}
                  />
                )}
              </div>
            </div>
          )}
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "")
                return !inline && match ? (
                  <div className="relative">
                    <div className="absolute right-2 top-0 text-xs overflow-visible whitespace-nowrap p-1 px-3 rounded mt-2">
                      <div className="tooltip-left tooltip" data-tip="Copy code to clipboard">
                        {used_icon_id === message.id + createHash({ str: String(children).replace(/\n$/, "") }) ? (
                          <MdCheck />
                        ) : (
                          <MdContentCopy
                            className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                            onClick={() => {
                              copyToClipboard(
                                String(children).replace(/\n$/, ""),
                                message.id + createHash({ str: String(children).replace(/\n$/, "") })
                              )
                            }}
                          />
                        )}
                      </div>
                    </div>
                    <SyntaxHighlighter
                      {...props}
                      children={String(children).replace(/\n$/, "")}
                      style={vscDarkPlus}
                      language={match[1]}
                      // PreTag="div"
                    />
                  </div>
                ) : (
                  <code {...props} className={className}>
                    {children}
                  </code>
                )
              },
            }}
          >{`${message.text} ${message.id === "temp" ? "▮" : ""}`}</ReactMarkdown>
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
                {used_icon_id ===
                message.id + createHash({ str: window?.getSelection()?.toString() || "" }) + "copy" ? (
                  <MdCheck />
                ) : (
                  <div className="tooltip tooltip-top" data-tip="Copy to clipboard">
                    <MdContentCopy
                      className="h-3.5 w-3.5"
                      onClick={() => {
                        copyToClipboard(
                          window?.getSelection()?.toString() || "",
                          message.id + createHash({ str: window?.getSelection()?.toString() || "" }) + "copy"
                        )
                      }}
                    />
                  </div>
                )}
              </Toolbar.ToggleItem>
              <Toolbar.ToggleItem
                className="flex-shrink-0 flex-grow-0 basis-auto h-3 px-2 rounded inline-flex leading-none items-center justify-center ml-0.5 outline-none focus:outline-none active:outline-none focus:relative first:ml-0 text-xs cursor-pointer hover:text-zinc-200"
                value="inbox"
              >
                {used_icon_id ===
                message.id + createHash({ str: window?.getSelection()?.toString() || "" }) + "clip" ? (
                  <MdCheck />
                ) : (
                  <div className="tooltip tooltip-top" data-tip="Save to inbox">
                    <MdInbox
                      className="h-3.5 w-3.5"
                      onClick={() => {
                        setInbox(true)
                        addToClipboard({
                          text: window?.getSelection()?.toString() || "",
                          msg_id: message.id,
                          icon_id: message.id + createHash({ str: window?.getSelection()?.toString() || "" }) + "clip",
                        })
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
