import { useLoaderData, useNavigate } from "react-router-dom"
import _ from "lodash"
import { NotepadsT } from "@/data/loaders/notepad"
import { Clip, NotepadS, NotepadT } from "@/data/schemas/notepad"
import { useEffect, useState } from "react"
// @ts-ignore
import {
  MdCheck,
  MdClose,
  MdSave,
  MdArrowDownward,
  MdArrowUpward,
  MdInbox,
} from "react-icons/md"
import ReactMarkdown from "react-markdown"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { RxDotsHorizontal } from "react-icons/rx"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { createHash } from "@/security/common"
import { MdContentCopy, MdEdit } from "react-icons/md"
import NotepadActions from "@/data/actions/notepad"
import { error } from "@/libraries/logging"
import { copyToClipboard } from "@/libraries/copypasta"
import { BiTrash } from "react-icons/bi"
import { UserT } from "@/data/loaders/user"
import { BiNotepad } from "react-icons/bi"
import { useEvent } from "@/components/hooks/useEvent"
import { emit, query } from "@/libraries/events"
import dayjs from "dayjs"
import { initLoaders } from "@/data/loaders"
import { mAppT } from "@/data/schemas/memory"
import useMemory from "@/components/hooks/useMemory"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { RxPlus } from "react-icons/rx"

let mouse_over_timer: any = null

export default function Notepad() {
  const user_state = useMemory<UserT>({ id: "user" })
  const notepad_state = useMemory<NotepadsT>({ id: "notepads" })

  const mem_app: mAppT = useMemory({ id: "app" })
  const { workspace_id, session_id } = mem_app

  const mem_notepad = useMemory<{
    notepad: NotepadT | undefined
    edited_clip: string
    dirty_clip: boolean
    field_edit_id: string
    used_icon_id: string
  }>({
    id: `session-${session_id}-notepad`,
    state: {
      notepad: undefined,
      edited_clip: "",
      dirty_clip: false,
      field_edit_id: "",
      used_icon_id: "",
    },
  })

  const { notepad, edited_clip, dirty_clip, field_edit_id, used_icon_id } =
    mem_notepad

  async function updateNotepad({ notepad }: { notepad?: NotepadT } = {}) {
    const _sid = session_id
    // console.log("update notepad", session_id)
    if (notepad && notepad.session_id === _sid)
      return (mem_notepad.notepad = notepad)
    if (notepad && notepad.session_id !== _sid) return
    if (!_sid) return
    // get current session id
    mem_notepad.notepad = notepad_state[_sid]
  }

  useEffect(() => {
    updateNotepad()
  }, [])

  useEffect(() => {
    // setSessionId(sid)
    updateNotepad()
  }, [JSON.stringify([notepad_state, session_id])])

  useEvent({
    name: "sessions/change",
    action: function ({ session_id }: { session_id: string }) {
      // console.log("notepad sessions/change", session_id)
      updateNotepad()
    },
  })

  useEvent({
    name: [
      "notepad.addClip.done",
      "notepad.updateNotepad.done",
      "notepad.deleteClip.done",
    ],
    // target: session_id,
    action: function ({
      notepad,
      session_id: sid,
    }: {
      notepad: NotepadT
      session_id: string
    }) {
      updateNotepad()
    },
  })

  const handleEdit = async (c: any) => {
    if (!session_id || edited_clip === c.data) return
    const updated_notepad = {
      ...notepad,
      clips: notepad?.clips.map((clip) =>
        clip.id === c.id ? { ...clip, data: edited_clip } : clip,
      ),
    }
    const cb = NotepadS.safeParse(updated_notepad)
    if (cb.success === false) {
      error({
        message: `Failed to update notepad: ${cb.error}`,
        data: cb.error,
      })
      return
    }
    await NotepadActions.updateNotepad({ session_id, notepad: cb.data })

    await updateNotepad()
    mem_notepad.field_edit_id = ""
    mem_notepad.edited_clip = ""
    mem_notepad.dirty_clip = false
  }

  const onEdit = async (c: any) => {
    if (field_edit_id === c.id + "all/edit") {
      mem_notepad.edited_clip = c.data
      mem_notepad.dirty_clip = false
      return (mem_notepad.field_edit_id = "")
    }
    mem_notepad.field_edit_id = c.id + "all/edit"
    mem_notepad.edited_clip = c.data
    const e = document.getElementById(`${c.id}`)
    if (e) {
      const height = e.clientHeight
      const paddingTop = parseInt(getComputedStyle(e).paddingTop)
      const paddingBottom = parseInt(getComputedStyle(e).paddingBottom)
      const ef_check = setInterval(() => {
        const ef = document.getElementById(`${c.id}-edit-field`)
        if (ef) {
          clearInterval(ef_check)
          ef.style.height = `${height - paddingTop - paddingBottom}px`
          ef.style.opacity = "1"
          ef.focus()
        }
      }, 10)
    }
  }

  useEffect(() => {
    setTimeout(() => {
      mem_notepad.used_icon_id = ""
    }, 1000)
  }, [used_icon_id])

  const moveClip = async ({ dir, clip }: { dir: "up" | "down"; clip: any }) => {
    const clip_i = notepad?.clips.findIndex((c) => c.id === clip.id)
    if (clip_i === undefined || !notepad) return
    if (
      (clip_i <= 0 && dir === "up") ||
      (clip_i >= notepad?.clips.length - 1 && dir === "down") ||
      !notepad
    )
      return
    const new_notepad = { ...notepad, clips: [...notepad.clips] }
    const swap_i = dir === "up" ? clip_i - 1 : clip_i + 1
    ;[new_notepad.clips[clip_i], new_notepad.clips[swap_i]] = [
      new_notepad.clips[swap_i],
      new_notepad.clips[clip_i],
    ]
    const cb = NotepadS.safeParse(new_notepad)
    if (cb.success === false) {
      error({
        message: `Failed to update notepad: ${cb.error}`,
        data: cb.error,
      })
      return
    }
    await NotepadActions.updateNotepad({ session_id, notepad: cb.data })
    updateNotepad()
  }

  const onDelete = async (c: any) => {
    if (!session_id) return
    await NotepadActions.deleteClip({ session_id, clip_id: c.id })
    await updateNotepad()
  }

  function combineClips() {
    const workspace = _.find(user_state.workspaces, { id: workspace_id })
    if (!notepad || !workspace) return
    let session_name = ""
    for (const group of workspace.groups) {
      for (const folder of group.folders) {
        const session = folder.sessions?.find((s) => s.id === session_id)
        if (session) session_name = session.name
      }
    }
    const text = notepad.clips.map((c) => c.data).join("\n\n")
    return {
      text,
      session_name:
        text
          .split("\n")[0]
          ?.trim()
          .replace(/^([#]+) /g, "") || session_name,
    }
  }

  function addCombinedToData() {
    const combined = combineClips()
    if (!combined) return error({ message: "Failed to add to data" })
    const { text, session_name } = combined
    emit({
      type: "AddData/show",
      data: {
        file: {
          name: session_name ? session_name : "notepad",
        },
        mime: "text/plain",
        content: text,
        workspace_id,
      },
    })
  }

  function generateTextFile() {
    const combined = combineClips()
    if (!combined) return error({ message: "Failed to generate text file" })
    const { text, session_name } = combined
    const element = document.createElement("a")
    const file = new Blob([text], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = session_name ? session_name + ".txt" : "notepad.txt"
    document.body.appendChild(element) // Required for this to work in FireFox
    element.click()
  }

  async function addEmptyClip() {
    if (!session_id) return
    const clip = await query({
      type: "notepad.add",
      data: { session_id, data: "New note", msg_id: "0", type: "text" },
    })
  }

  const [is_hovering, setIsHovering] = useState("")

  const handleMouseHover = (state: boolean, c: Clip) => {
    if (state && !is_hovering) {
      clearInterval(mouse_over_timer)
      emit({ type: "chat/message-hover", data: { id: c.id } })
      setIsHovering(c.id)
      mouse_over_timer = setTimeout(() => setIsHovering(""), 10000)
    } else if (!state && is_hovering) {
      setIsHovering("")
      clearInterval(mouse_over_timer)
    }
  }

  useEvent({
    name: "chat/message-hover",
    //target: message.id,
    action: ({ id }: { id: string }) => {
      if (id !== is_hovering) setIsHovering("")
    },
  })

  return (
    <div className="Notepad flex flex-col px-3 pt-2 gap-6 w-full bg-zinc-900 bg-gradient-to-br from-zinc-800/30 to-zinc-700/30 overflow-auto overflow-x-hidden">
      <div className="flex flex-row text-zinc-300 text-sm font-semibold pb-1">
        <div className="flex-grow">Notepad</div>
        <div className="flex items-center gap-2">
          <button
            className="outline-none tooltip tooltip-left"
            data-tip="Create new note"
            onClick={addEmptyClip}
          >
            <RxPlus
              className={`w-3 h-3 flex flex-1 items-center cursor-pointer font-semibold text-sm `}
            />
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="outline-none">
                <RxDotsHorizontal
                  className={`w-3 h-3 flex flex-1 items-center cursor-pointer font-semibold text-sm `}
                />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="bg-zinc-800 border border-zinc-600 text-zinc-300 rounded-md shadow-lg shadow-zinc-900 outline-none"
                sideOffset={5}
              >
                <DropdownMenu.Item className="text-xs pl-4 pr-6 py-2 outline-none  hover:text-zinc-200">
                  <button
                    className="outline-none"
                    disabled={notepad?.clips?.length || 0 > 0 ? false : true}
                    onClick={() => {
                      if (!notepad) return
                      addCombinedToData()
                    }}
                  >
                    Combine & add to data
                  </button>
                </DropdownMenu.Item>
                <DropdownMenu.Item className="text-xs pl-4 pr-6 py-2 outline-none  hover:text-zinc-200">
                  <button
                    className="outline-none"
                    disabled={notepad?.clips?.length || 0 > 0 ? false : true}
                    onClick={() => {
                      if (!notepad) return
                      const text = notepad.clips.map((c) => c.data).join("\n\n")
                      copyToClipboard(text)
                    }}
                  >
                    Copy to clipboard
                  </button>
                </DropdownMenu.Item>
                <DropdownMenu.Item className="text-xs pl-4 pr-6 py-2 outline-none  hover:text-zinc-200">
                  <button
                    className="outline-none"
                    disabled={notepad?.clips?.length || 0 > 0 ? false : true}
                    onClick={() => generateTextFile()}
                  >
                    Save as a text file
                  </button>
                </DropdownMenu.Item>
                <DropdownMenu.Arrow className="fill-zinc-600 border-zinc-600" />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
      {mem_notepad.notepad?.clips?.length || 0 > 0 ?
        <>
          {_(mem_notepad.notepad?.clips)
            .uniqBy("id")
            ?.map((c) => {
              return (
                <div
                  className={`flex flex-col w-auto rounded-xl px-4 py-3 text-xs relative cursor-text bg-zinc-800/50 border-2 border-zinc-900/80 text-sm rounded-lg ph-no-capture ${
                    field_edit_id === c.id + "all/edit" ? "border-dashed" : ""
                  }`}
                  key={c.id}
                  id={c.id}
                  onMouseEnter={() => handleMouseHover(true, c)}
                  onMouseLeave={() => handleMouseHover(false, c)}
                >
                  {is_hovering === c.id && (
                    <div
                      className={`flex gap-2  bg-zinc-800 absolute right-2 -top-6 text-xs overflow-visible whitespace-nowrap py-2 px-3 rounded-lg mt-2 transition-all ${
                        field_edit_id === c.id + "all/edit" ?
                          "bg-zinc-900"
                        : "bg-zinc-900"
                      }`}
                    >
                      {field_edit_id === c.id + "all/edit" ?
                        <>
                          <div
                            className="tooltip-left tooltip"
                            data-tip="Save your changes"
                          >
                            {used_icon_id === c.id + "all/copy" ?
                              <MdCheck />
                            : <MdSave
                                className={`h-3 w-3 cursor-pointer  ${
                                  dirty_clip ?
                                    "hover:text-zinc-200 text-zinc-400"
                                  : "text-zinc-600 cursor-default"
                                }`}
                                onClick={() => handleEdit(c)}
                              />
                            }
                          </div>
                          <div
                            className="tooltip tooltip-top"
                            data-tip="Discard edits"
                          >
                            {used_icon_id === c.id + "all/edit" ?
                              <MdCheck />
                            : <MdClose
                                className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                                onClick={() => {
                                  // setDirtyClip(false)
                                  mem_notepad.dirty_clip = false
                                  // return setFieldEditId("")
                                  mem_notepad.field_edit_id = ""
                                }}
                              />
                            }
                          </div>
                        </>
                      : <>
                          <div
                            className="tooltip tooltip-top"
                            data-tip="Delete clip"
                          >
                            {used_icon_id === c.id + "all/delete" ?
                              <MdCheck />
                            : <BiTrash
                                className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                                onClick={() => {
                                  if (confirm("Delete this clip?")) {
                                    onDelete(c)
                                  }
                                }}
                              />
                            }
                          </div>
                          <div
                            className="tooltip tooltip-top"
                            data-tip="Move clip up"
                          >
                            {used_icon_id === c.id + "all/order-up" ?
                              <MdCheck />
                            : <MdArrowUpward
                                className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                                onClick={(e) => {
                                  moveClip({ dir: "up", clip: c })
                                }}
                              />
                            }
                          </div>
                          <div
                            className="tooltip tooltip-top"
                            data-tip="Move clip down"
                          >
                            {used_icon_id === c.id + "all/order-down" ?
                              <MdCheck />
                            : <MdArrowDownward
                                className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                                onClick={(e) => {
                                  moveClip({ dir: "down", clip: c })
                                }}
                              />
                            }
                          </div>
                          <div
                            className="tooltip tooltip-top"
                            data-tip="Copy clip"
                          >
                            {used_icon_id === c.id + "all/copy" ?
                              <MdCheck />
                            : <MdContentCopy
                                className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  copyToClipboard(
                                    c.data,
                                    c.id + "all/copy",
                                    (id: string) => {
                                      // setUsedIcon(id)
                                      mem_notepad.used_icon_id = id
                                    },
                                  )
                                  return false
                                }}
                              />
                            }
                          </div>
                          <div
                            className="tooltip tooltip-top"
                            data-tip="Edit clip"
                          >
                            {used_icon_id === c.id + "all/edit" ?
                              <MdCheck />
                            : <MdEdit
                                className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  onEdit(c)
                                }}
                              />
                            }
                          </div>
                          <div
                            className="tooltip tooltip-top"
                            data-tip="Add to data"
                          >
                            {used_icon_id === c.id + "data/add" ?
                              <MdCheck />
                            : <MdInbox
                                className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                                onClick={async (e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  emit({
                                    type: "AddData/show",
                                    data: {
                                      file: {
                                        name:
                                          c.data
                                            .split("\n")[0]
                                            ?.trim()
                                            .replace(/^([#]+) /g, "") ||
                                          `${dayjs().format(
                                            "YYYY-MM-DD",
                                          )} - untitled`,
                                      },
                                      mime: "text/plain",
                                      content: c.data,
                                      workspace_id,
                                    },
                                  })
                                }}
                              />
                            }
                          </div>
                        </>
                      }
                    </div>
                  )}
                  {field_edit_id === c.id + "all/edit" ?
                    <textarea
                      id={`${c.id}-edit-field`}
                      defaultValue={edited_clip}
                      className="text-[10px] bg-transparent border-0 m-0 p-0 font-mono"
                      style={{ opacity: 1 }}
                      onChange={(e) => {
                        mem_notepad.dirty_clip = true
                        mem_notepad.edited_clip = e.target.value
                      }}
                      onBlur={() => {
                        if (!dirty_clip) return (mem_notepad.field_edit_id = "")
                      }}
                    ></textarea>
                  : <div onClick={() => onEdit(c)}>
                      <ReactMarkdown
                        components={{
                          code({ node, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || "")
                            return match ?
                                <div className="relative code flex fit-content">
                                  <div className="flex gap-2 absolute right-0 top-1 text-xs overflow-visible whitespace-nowrap p-1 px-3 rounded mt-2">
                                    <div
                                      className="tooltip-left tooltip"
                                      data-tip="Verify code (coming soon)"
                                    >
                                      {(
                                        used_icon_id ===
                                        c.id +
                                          createHash({
                                            str: String(children).replace(
                                              /\n$/,
                                              "",
                                            ),
                                          })
                                      ) ?
                                        <MdCheck />
                                      : <MdContentCopy
                                          className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                                          onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            copyToClipboard(
                                              String(children).replace(
                                                /\n$/,
                                                "",
                                              ),
                                              c.id +
                                                createHash({
                                                  str: String(children).replace(
                                                    /\n$/,
                                                    "",
                                                  ),
                                                }),
                                              (id: string) => {
                                                // setUsedIcon(id)
                                                mem_notepad.used_icon_id = id
                                              },
                                            )
                                            return false
                                          }}
                                        />
                                      }
                                    </div>
                                  </div>
                                  <SyntaxHighlighter
                                    children={String(children).replace(
                                      /\n$/,
                                      "",
                                    )}
                                    style={vscDarkPlus}
                                    language={match[1]}
                                  />
                                </div>
                              : <code {...props} className={className}>
                                  {children}
                                </code>
                          },
                        }}
                        rehypePlugins={[rehypeRaw]}
                        remarkPlugins={[remarkGfm]}
                      >
                        {c.data}
                      </ReactMarkdown>
                    </div>
                  }
                </div>
              )
            })
            .value()}
        </>
      : <div className="flex flex-col align-center items-center justify-center flex-grow text-zinc-600 font-semibold">
          <BiNotepad className="w-32 h-32" />
          This session has no notes saved
        </div>
      }
    </div>
  )
}
