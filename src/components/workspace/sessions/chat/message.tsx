import React, { useEffect, useState } from "react"
import { TextMessageT } from "@/data/loaders/sessions"
import ReactMarkdown from "react-markdown"
import { MdCheck, MdContentCopy, MdInbox } from "react-icons/md"
import { useNavigate, useParams } from "react-router-dom"
import NotepadActions from "@/data/actions/notepad"
import * as Selection from "selection-popover"
import * as Toolbar from "@radix-ui/react-toolbar"
import { error } from "@/components/libraries/logging"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { createHash } from "@/security/common"
import { GoCodescan } from "react-icons/go"
import { copyToClipboard } from "@/components/libraries/copypasta"
import { BiNotepad } from "react-icons/bi"
import _ from "lodash"

type MessageProps = {
  message: TextMessageT
  isActive: boolean
  onClick: () => void
  className?: string
}

let mouse_over_timer: any = null

const Message: React.FC<MessageProps> = ({ message, isActive, onClick, className }) => {
  const navigate = useNavigate()
  const workspace_id = useParams().workspace_id
  const session_id = useParams().session_id

  const [used_icon_id, setUsedIcon] = useState("")

  const [is_hovering, setIsHovering] = useState(false)

  const handleMouseHover = (state: boolean) => {
    if (state && !is_hovering) {
      clearInterval(mouse_over_timer)
      setIsHovering(true)
    } else if (!state && is_hovering) {
      mouse_over_timer = setTimeout(() => setIsHovering(false), 2000)
    }
  }

  const selector_delay = 1000

  function closeSelection() {
    window?.getSelection()?.empty()
    setUsedIcon("")
    const selection_box = document.querySelector("div[data-side=top]") as HTMLElement
    if (selection_box) selection_box.style.opacity = "0"
  }

  useEffect(() => {
    if (used_icon_id) setTimeout(closeSelection, selector_delay)
  }, [used_icon_id])

  const addToClipboard = async ({ text, msg_id, icon_id }: { text: string; msg_id: string; icon_id?: string }) => {
    if (text && msg_id && session_id) {
      if (icon_id) setUsedIcon(icon_id)
      await NotepadActions.add({ session_id, data: text, msg_id, type: "text" })
      setTimeout(closeSelection, selector_delay)
      if (workspace_id) navigate(`/conductor/${workspace_id}/${session_id}`)
    }
  }
  // console.log(new Date().getTime(), selection_open, is_hovering)
  return (
    <div
      onMouseEnter={() => handleMouseHover(true)}
      onMouseLeave={() => handleMouseHover(false)}
      className=""
    >
      <Selection.Root>
        <Selection.Trigger className="flex">
          <div
            className={`chat flex flex-col max-w-screen-lg border-t border-t-zinc-700 py-2 px-4 text-sm rounded-lg justify-center items-start relative ${
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
            {is_hovering && isActive && (
              <div className="flex gap-2 border-t border-t-zinc-700 bg-zinc-800 absolute right-2 -top-7 text-xs overflow-visible whitespace-nowrap py-2 px-3 rounded-lg mt-2">
                <div className="tooltip-left tooltip" data-tip="Copy message to clipboard">
                  {used_icon_id === message.id + "all/copy" ? (
                    <MdCheck />
                  ) : (
                    <MdContentCopy
                      className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                      onClick={() => {
                        copyToClipboard(message.text, message.id + "all/copy", setUsedIcon)
                      }}
                    />
                  )}
                </div>
                <div className="tooltip tooltip-top" data-tip="Save to notepad">
                  {used_icon_id === message.id + "all/clip" ? (
                    <MdCheck />
                  ) : (
                    <BiNotepad
                      className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                      onClick={() => {
                        addToClipboard({
                          text: message.text || "",
                          msg_id: message.id,
                          icon_id: message.id + "all/clip",
                        })
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
                    <div
                      className="relative"
                      /* onMouseEnter={handleMouseHoverCode}
                  onMouseLeave={handleMouseHoverCode}  */
                    >
                      <div className="flex gap-2 absolute right-2 top-0 text-xs overflow-visible whitespace-nowrap p-1 px-3 rounded mt-2 ph-no-capture">
                        <div className="tooltip-left tooltip" data-tip="Verify code (coming soon)">
                          {used_icon_id ===
                          message.id + createHash({ str: String(children).replace(/\n$/, "") }) + "scan" ? (
                            <MdCheck />
                          ) : (
                            <GoCodescan
                              className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                              onClick={() => {
                                alert("Coming soon")
                              }}
                            />
                          )}
                        </div>
                        <div className="tooltip-left tooltip" data-tip="Copy code to clipboard">
                          {used_icon_id ===
                          message.id + createHash({ str: String(children).replace(/\n$/, "") }) + "copy" ? (
                            <MdCheck />
                          ) : (
                            <MdContentCopy
                              className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                              onClick={() => {
                                copyToClipboard(
                                  String(children).replace(/\n$/, ""),
                                  message.id + createHash({ str: String(children).replace(/\n$/, "") }) + "copy",
                                  setUsedIcon
                                )
                              }}
                            />
                          )}
                        </div>
                        <div className="tooltip tooltip-left" data-tip="Save code to notepad">
                          {used_icon_id === message.id + "all/clip" ? (
                            <MdCheck />
                          ) : (
                            <BiNotepad
                              className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                              onClick={() => {
                                addToClipboard({
                                  text: `\`\`\`${match[1] || ""}\n${String(children).replace(/\n$/, "")}\n\`\`\``,
                                  msg_id: message.id,
                                  icon_id:
                                    message.id + createHash({ str: String(children).replace(/\n$/, "") }) + "notepad",
                                })
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
                      />
                    </div>
                  ) : (
                    <code {...props} className={className}>
                      {children}
                    </code>
                  )
                },
              }}
              rehypePlugins={[]}
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
                            message.id + createHash({ str: window?.getSelection()?.toString() || "" }) + "copy",
                            setUsedIcon
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
                    <div className="tooltip tooltip-top" data-tip="Save to notepad">
                      <MdInbox
                        className="h-3.5 w-3.5"
                        onClick={() => {
                          addToClipboard({
                            text: window?.getSelection()?.toString() || "",
                            msg_id: message.id,
                            icon_id:
                              message.id + createHash({ str: window?.getSelection()?.toString() || "" }) + "clip",
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
    </div>
  )
}

export default Message
