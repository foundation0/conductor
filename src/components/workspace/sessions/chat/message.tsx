import React, {
  JSXElementConstructor,
  ReactElement,
  useEffect,
  useState,
} from "react"
import { TextMessageT } from "@/data/loaders/sessions"
import ReactMarkdown from "react-markdown"
import { MdCheck, MdContentCopy, MdEdit } from "react-icons/md"
import NotepadActions from "@/data/actions/notepad"
import * as Selection from "selection-popover"
import * as Toolbar from "@radix-ui/react-toolbar"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { createHash } from "@/security/common"
import { GoCodescan } from "react-icons/go"
import { copyToClipboard } from "@/libraries/copypasta"
import { BiNotepad } from "react-icons/bi"
import _ from "lodash"
import { emit } from "@/libraries/events"
import { RxCornerBottomLeft } from "react-icons/rx"
import { useEvent } from "@/components/hooks/useEvent"
import { mAppT } from "@/data/schemas/memory"
import useMemory from "@/components/hooks/useMemory"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"

type MessageProps = {
  message: TextMessageT
  isActive: boolean
  onClick: () => void
  className?: string
  avatar?: ReactElement<any, string | JSXElementConstructor<any>>
}

let mouse_over_timer: any = null

const Message: React.FC<MessageProps> = ({
  message,
  isActive,
  onClick,
  className,
  avatar,
}) => {
  // const workspace_id = useParams().workspace_id
  // const session_id = useParams().session_id
  const mem_app: mAppT = useMemory({ id: "app" })
  const { session_id } = mem_app
  const [used_icon_id, setUsedIcon] = useState("")

  const [is_hovering, setIsHovering] = useState(false)

  const handleMouseHover = (state: boolean) => {
    if (state && !is_hovering) {
      clearInterval(mouse_over_timer)
      emit({ type: "chat/message-hover", data: { id: message.id } })
      setIsHovering(true)
      mouse_over_timer = setTimeout(() => setIsHovering(false), 10000)
    } else if (!state && is_hovering) {
      setIsHovering(false)
      clearInterval(mouse_over_timer)
    }
  }

  useEvent({
    name: "chat/message-hover",
    //target: message.id,
    action: ({ id }: { id: string }) => {
      if (id !== message.id) setIsHovering(false)
    },
  })

  const selector_delay = 1000

  function closeSelection() {
    window?.getSelection()?.empty()
    setUsedIcon("")
    const selection_box = document.querySelector(
      "div[data-side=top]",
    ) as HTMLElement
    if (selection_box) selection_box.style.opacity = "0"
  }

  useEffect(() => {
    if (used_icon_id) setTimeout(closeSelection, selector_delay)
  }, [used_icon_id])

  const addToClipboard = async ({
    text,
    msg_id,
    icon_id,
  }: {
    text: string
    msg_id: string
    icon_id?: string
  }) => {
    if (text && msg_id && session_id) {
      if (icon_id) setUsedIcon(icon_id)
      await NotepadActions.add({ session_id, data: text, msg_id, type: "text" })
      setTimeout(closeSelection, selector_delay)
    }
  }
  // console.log(new Date().getTime(), selection_open, is_hovering)

  return (
    <div
      id={`msg-${message.id}`}
      onMouseEnter={() => handleMouseHover(true)}
      onMouseLeave={() => handleMouseHover(false)}
      className="flex flex-row"
    >
      {!isActive && (
        <RxCornerBottomLeft className="w-3 h-3 text-zinc-700 flex-shrink-0" />
      )}
      {avatar && (
        <div className="flex flex-shrink">
          <div className="flex">
            <div className="avatar placeholder">
              <div className=" text-zinc-200 w-6 h-6 flex ">
                <span className="text-sm w-full h-full flex justify-center items-center">
                  {avatar}
                  {/* <img className={`border-2 border-zinc-900 rounded-full`} src={avatar} /> */}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      <Selection.Root>
        <Selection.Trigger className="flex ph-no-capture">
          <div
            className={`chat flex flex-col max-w-screen-lg border-2 border-zinc-900/80  text-sm rounded-lg justify-start items-start relative transition-all ${
              isActive ?
                " text-zinc-200 py-2 px-4 "
              : "bg-zinc-800 text-zinc-400 text-xs hover:bg-zinc-700 border-zinc-700 cursor-pointer overflow-x-hidden text-left m-0 py-1 px-3"
            } ${
              message.type === "ai" ?
                "bg-zinc-800"
              : "border-zinc-800 bg-zinc-800 text-zinc-300"
            }
          ${className} ${
            message.hash === "1337" ? "italic text-xs opacity-100" : ""
          }`}
            onClick={() => {
              if (!isActive) {
                onClick()
              }
            }}
          >
            {is_hovering && isActive && (
              <div
                className="flex gap-3 border-2 border-zinc-900/70 backdrop-blur bg-zinc-900/50 absolute right-1 -top-9 text-xs overflow-visible whitespace-nowrap py-1.5 px-3 rounded-t-xl  mt-2"
                onMouseEnter={() => handleMouseHover(true)}
              >
                <div
                  className="tooltip-top tooltip"
                  data-tip="Copy message to clipboard"
                >
                  {used_icon_id === message.id + "all/copy" ?
                    <MdCheck />
                  : <MdContentCopy
                      className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                      onClick={() => {
                        copyToClipboard(
                          message.text,
                          message.id + "all/copy",
                          setUsedIcon,
                        )
                      }}
                    />
                  }
                </div>
                <div className="tooltip tooltip-top" data-tip="Save to notepad">
                  {used_icon_id === message.id + "all/clip" ?
                    <MdCheck />
                  : <BiNotepad
                      className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                      onClick={() => {
                        addToClipboard({
                          text: message.text || "",
                          msg_id: message.id,
                          icon_id: message.id + "all/clip",
                        })
                      }}
                    />
                  }
                </div>
                <div
                  className="tooltip tooltip-top"
                  data-tip="Editing coming soon"
                >
                  <MdEdit
                    className="h-3 w-3 cursor-not-allowed hover:text-zinc-200 text-zinc-400"
                    /* onClick={() => {
                        addToClipboard({
                          text: message.text || "",
                          msg_id: message.id,
                          icon_id: message.id + "all/clip",
                        })
                      }} */
                  />
                </div>
              </div>
            )}
            <ReactMarkdown
              components={{
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "")
                  return match ?
                      <div
                        className="relative"
                        /* onMouseEnter={handleMouseHoverCode}
                  onMouseLeave={handleMouseHoverCode}  */
                      >
                        <div className="flex gap-2 absolute right-2 top-0 text-xs overflow-visible whitespace-nowrap p-1 px-3 rounded mt-2">
                          <div
                            className="tooltip-left tooltip"
                            data-tip="Verify code (coming soon)"
                          >
                            {(
                              used_icon_id ===
                              message.id +
                                createHash({
                                  str: String(children).replace(/\n$/, ""),
                                }) +
                                "scan"
                            ) ?
                              <MdCheck />
                            : <GoCodescan
                                className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                                onClick={() => {
                                  alert("Coming soon")
                                }}
                              />
                            }
                          </div>
                          <div
                            className="tooltip-left tooltip"
                            data-tip="Copy code to clipboard"
                          >
                            {(
                              used_icon_id ===
                              message.id +
                                createHash({
                                  str: String(children).replace(/\n$/, ""),
                                }) +
                                "copy"
                            ) ?
                              <MdCheck />
                            : <MdContentCopy
                                className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                                onClick={() => {
                                  copyToClipboard(
                                    String(children).replace(/\n$/, ""),
                                    message.id +
                                      createHash({
                                        str: String(children).replace(
                                          /\n$/,
                                          "",
                                        ),
                                      }) +
                                      "copy",
                                    setUsedIcon,
                                  )
                                }}
                              />
                            }
                          </div>
                          <div
                            className="tooltip tooltip-left"
                            data-tip="Save code to notepad"
                          >
                            {used_icon_id === message.id + "all/clip" ?
                              <MdCheck />
                            : <BiNotepad
                                className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                                onClick={() => {
                                  addToClipboard({
                                    text: `\`\`\`${match[1] || ""}\n${String(
                                      children,
                                    ).replace(/\n$/, "")}\n\`\`\``,
                                    msg_id: message.id,
                                    icon_id:
                                      message.id +
                                      createHash({
                                        str: String(children).replace(
                                          /\n$/,
                                          "",
                                        ),
                                      }) +
                                      "notepad",
                                  })
                                }}
                              />
                            }
                          </div>
                        </div>
                        <SyntaxHighlighter
                          children={String(children).replace(/\n$/, "")}
                          style={vscDarkPlus}
                          language={match[1]}
                        />
                      </div>
                    : <code {...props} className={className}>
                        {children}
                      </code>
                },
              }}
              rehypePlugins={[]}
              remarkPlugins={[remarkGfm]}
            >{`${message.text} ${
              message.id === "temp" ? "▮" : ""
            }`}</ReactMarkdown>
          </div>
        </Selection.Trigger>
        <Selection.Portal>
          <Selection.Content>
            <Toolbar.Root className="flex p-[5px] w-full min-w-max rounded-md bg-zinc-800 border border-zinc-600 text-zinc-300 shadow-lg shadow-zinc-900">
              <Toolbar.ToggleGroup type="multiple">
                <Toolbar.ToggleItem
                  className="flex-shrink-0 flex-grow-0 basis-auto h-3 px-2 rounded inline-flex leading-none items-center justify-center ml-0.5 outline-none focus:outline-none active:outline-none focus:relative first:ml-0 text-xs cursor-pointer hover:text-zinc-200"
                  value="copy"
                  onMouseEnter={() => handleMouseHover(true)}
                  onMouseLeave={() => handleMouseHover(false)}
                >
                  {(
                    used_icon_id ===
                    message.id +
                      createHash({
                        str: window?.getSelection()?.toString() || "",
                      }) +
                      "copy"
                  ) ?
                    <MdCheck />
                  : <div
                      className="tooltip tooltip-top"
                      data-tip="Copy to clipboard"
                    >
                      <MdContentCopy
                        className="h-3 w-3"
                        onClick={() => {
                          copyToClipboard(
                            window?.getSelection()?.toString() || "",
                            message.id +
                              createHash({
                                str: window?.getSelection()?.toString() || "",
                              }) +
                              "copy",
                            setUsedIcon,
                          )
                        }}
                      />
                    </div>
                  }
                </Toolbar.ToggleItem>
                <Toolbar.ToggleItem
                  className="flex-shrink-0 flex-grow-0 basis-auto h-3 px-2 rounded inline-flex leading-none items-center justify-center ml-0.5 outline-none focus:outline-none active:outline-none focus:relative first:ml-0 text-xs cursor-pointer hover:text-zinc-200"
                  value="inbox"
                >
                  {(
                    used_icon_id ===
                    message.id +
                      createHash({
                        str: window?.getSelection()?.toString() || "",
                      }) +
                      "clip"
                  ) ?
                    <MdCheck />
                  : <div
                      className="tooltip tooltip-top"
                      data-tip="Save to notepad"
                    >
                      <BiNotepad
                        className="h-3 w-3"
                        onClick={() => {
                          addToClipboard({
                            text: window?.getSelection()?.toString() || "",
                            msg_id: message.id,
                            icon_id:
                              message.id +
                              createHash({
                                str: window?.getSelection()?.toString() || "",
                              }) +
                              "clip",
                          })
                        }}
                      />
                    </div>
                  }
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
