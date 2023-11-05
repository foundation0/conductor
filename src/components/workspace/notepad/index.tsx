import { useLoaderData, useNavigate, useParams } from "react-router-dom"
import _, { update } from "lodash"
import { NotepadsT } from "@/data/loaders/notepad"
import { NotepadS, NotepadT } from "@/data/schemas/notepad"
import { useEffect, useState } from "react"
import { z } from "zod"
// @ts-ignore
import { MdCheck, MdClose, MdSave, MdArrowDownward, MdArrowUpward, MdInbox } from "react-icons/md"
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
import SessionsActions from "@/data/actions/sessions"
import dayjs from "dayjs"
import { initLoaders } from "@/data/loaders"

export default function Notepad() {
  const { notepad_state, user_state } = useLoaderData() as { notepad_state: NotepadsT; user_state: UserT }
  //const session_id = useParams().session_id as string
  const sid = useParams().session_id as string
  const [session_id, setSessionId] = useState<string>(sid)
  const workspace_id = useParams().workspace_id as string
  const [field_edit_id, setFieldEditId] = useState("")
  const [used_icon_id, setUsedIcon] = useState("")
  const navigate = useNavigate()

  const [notepad, setNotepad] = useState<z.infer<typeof NotepadS> | undefined>(notepad_state[session_id || ""])
  const [edited_clip, setEditedClip] = useState<string>("")
  const [dirty_clip, setDirtyClip] = useState<boolean>(false)

  async function updateNotepad() {
    // console.log("update notepad", session_id)
    if (session_id === undefined) return
    const { NotepadState } = await initLoaders()
    const notepad_state = await NotepadState.get()
    // get current session id
    setNotepad(notepad_state[session_id])
  }

  useEffect(() => {
    //SessionsActions.getCurrentSessionId({ workspace_id }).then(({ session_id }: { session_id: string }) => {
    updateNotepad()
    //setSessionId(session_id)
    //})
  }, [])

  useEffect(() => {
    updateNotepad()
  }, [JSON.stringify([notepad_state, session_id])])

  useEvent({
    name: "sessions/change",
    action: ({ session_id }: { session_id: string }) => {
      // console.log("sessions/change", session_id)
      setSessionId(session_id)
    },
  })

  useEvent({
    name: ["notepad.add.done", "notepad.updateNotepad.done", "notepad.deleteClip.done"],
    action: (notepad: NotepadT) => {
      // console.log("update")
      updateNotepad()
    },
  })

  const handleEdit = async (c: any) => {
    if (!session_id || edited_clip === c.data) return
    const updated_notepad = {
      ...notepad,
      clips: notepad?.clips.map((clip) => (clip.id === c.id ? { ...clip, data: edited_clip } : clip)),
    }
    const cb = NotepadS.safeParse(updated_notepad)
    if (cb.success === false) {
      error({ message: `Failed to update notepad: ${cb.error}`, data: cb.error })
      return
    }
    await NotepadActions.updateNotepad({ session_id, notepad: cb.data })
    setNotepad(cb.data)
    setFieldEditId("")
    setDirtyClip(false)
    setTimeout(() => {
      navigate(`/c/${workspace_id}/${session_id}`)
    }, 200)
  }

  const onEdit = async (c: any) => {
    if (field_edit_id === c.id + "all/edit") {
      setEditedClip(c.data)
      setDirtyClip(false)
      return setFieldEditId("")
    }
    setFieldEditId(c.id + "all/edit")
    setEditedClip(c.data)
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
      setUsedIcon("")
    }, 1000)
  }, [used_icon_id])

  const moveClip = ({ dir, clip }: { dir: "up" | "down"; clip: any }) => {
    const clip_i = notepad?.clips.findIndex((c) => c.id === clip.id)
    if (clip_i === undefined || !notepad) return
    if ((clip_i <= 0 && dir === "up") || (clip_i >= notepad?.clips.length - 1 && dir === "down") || !notepad) return
    const new_notepad = { ...notepad, clips: [...notepad.clips] }
    const swap_i = dir === "up" ? clip_i - 1 : clip_i + 1
    ;[new_notepad.clips[clip_i], new_notepad.clips[swap_i]] = [new_notepad.clips[swap_i], new_notepad.clips[clip_i]]
    const cb = NotepadS.safeParse(new_notepad)
    if (cb.success === false) {
      error({ message: `Failed to update notepad: ${cb.error}`, data: cb.error })
      return
    }
    NotepadActions.updateNotepad({ session_id, notepad: cb.data })
    setNotepad(cb.data)
  }

  const onDelete = async (c: any) => {
    if (!session_id) return
    NotepadActions.deleteClip({ session_id, clip_id: c.id })
    setTimeout(() => {
      navigate(`/c/${workspace_id}/${session_id}`)
    }, 200)
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
    return { text, session_name: text.split("\n")[0] || session_name }
  }

  function addCombinedToData() {
    const combined = combineClips()
    if (!combined) return error({ message: "Failed to add to data" })
    const { text, session_name } = combined
    emit({
      type: "data.import",
      data: {
        file: {
          name: session_name ? session_name + ".txt" : "notepad.txt",
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

  return (
    <div className="Notepad flex flex-col px-3 pt-2 gap-6 w-full bg-zinc-800  overflow-auto overflow-x-hidden">
      <div className="flex flex-row text-zinc-300 text-sm font-semibold pb-1">
        <div className="flex-grow">Notepad</div>
        <div className="flex items-center">
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
      {notepad?.clips?.length || 0 > 0 ? (
        <>
          {notepad?.clips?.map((c) => {
            return (
              <div
                className={`flex flex-col w-auto rounded-xl px-4 py-3 text-xs relative cursor-text bg-zinc-900 ph-no-capture ${
                  field_edit_id === c.id + "all/edit" ? "border-2 border-dashed border-zinc-700" : ""
                }`}
                key={c.id}
                id={c.id}
              >
                <div
                  className={`flex gap-2  bg-zinc-900 absolute right-2 -top-6 text-xs overflow-visible whitespace-nowrap py-2 px-3 rounded-lg mt-2 ${
                    field_edit_id === c.id + "all/edit"
                      ? "bg-zinc-900 border-t-2 border-dashed border-t-zinc-700"
                      : "bg-zinc-900"
                  }`}
                >
                  {field_edit_id === c.id + "all/edit" ? (
                    <>
                      <div className="tooltip-left tooltip" data-tip="Save your changes">
                        {used_icon_id === c.id + "all/copy" ? (
                          <MdCheck />
                        ) : (
                          <MdSave
                            className={`h-3 w-3 cursor-pointer  ${
                              dirty_clip ? "hover:text-zinc-200 text-zinc-400" : "text-zinc-600 cursor-default"
                            }`}
                            onClick={() => handleEdit(c)}
                          />
                        )}
                      </div>
                      <div className="tooltip tooltip-top" data-tip="Discard edits">
                        {used_icon_id === c.id + "all/edit" ? (
                          <MdCheck />
                        ) : (
                          <MdClose
                            className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                            onClick={() => {
                              setDirtyClip(false)
                              return setFieldEditId("")
                            }}
                          />
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="tooltip tooltip-top" data-tip="Delete clip">
                        {used_icon_id === c.id + "all/delete" ? (
                          <MdCheck />
                        ) : (
                          <BiTrash
                            className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                            onClick={() => {
                              if (confirm("Delete this clip?")) onDelete(c)
                            }}
                          />
                        )}
                      </div>
                      <div className="tooltip tooltip-top" data-tip="Move clip up">
                        {used_icon_id === c.id + "all/order-up" ? (
                          <MdCheck />
                        ) : (
                          <MdArrowUpward
                            className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                            onClick={(e) => {
                              moveClip({ dir: "up", clip: c })
                            }}
                          />
                        )}
                      </div>
                      <div className="tooltip tooltip-top" data-tip="Move clip down">
                        {used_icon_id === c.id + "all/order-down" ? (
                          <MdCheck />
                        ) : (
                          <MdArrowDownward
                            className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                            onClick={(e) => {
                              moveClip({ dir: "down", clip: c })
                            }}
                          />
                        )}
                      </div>
                      <div className="tooltip tooltip-top" data-tip="Copy clip">
                        {used_icon_id === c.id + "all/copy" ? (
                          <MdCheck />
                        ) : (
                          <MdContentCopy
                            className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              copyToClipboard(c.data, c.id + "all/copy", setUsedIcon)
                              return false
                            }}
                          />
                        )}
                      </div>
                      <div className="tooltip tooltip-top" data-tip="Edit clip">
                        {used_icon_id === c.id + "all/edit" ? (
                          <MdCheck />
                        ) : (
                          <MdEdit
                            className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              onEdit(c)
                            }}
                          />
                        )}
                      </div>
                      <div className="tooltip tooltip-top" data-tip="Add to data">
                        {used_icon_id === c.id + "data/add" ? (
                          <MdCheck />
                        ) : (
                          <MdInbox
                            className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                            onClick={async (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              emit({
                                type: "data.import",
                                data: {
                                  file: {
                                    name: c.data.split("\n")[0] || `${dayjs().format("YYYY-MM-DD")} - untitled`,
                                  },
                                  mime: "text/plain",
                                  content: c.data,
                                  workspace_id,
                                },
                              })
                            }}
                          />
                        )}
                      </div>
                    </>
                  )}
                </div>
                {field_edit_id === c.id + "all/edit" ? (
                  <textarea
                    id={`${c.id}-edit-field`}
                    value={edited_clip}
                    className="text-xs bg-transparent border-0 m-0 p-0"
                    style={{ opacity: 1 }}
                    onChange={(e) => {
                      setDirtyClip(true)
                      setEditedClip(e.target.value)
                    }}
                    onBlur={() => {
                      if (!dirty_clip) return setFieldEditId("")
                    }}
                  ></textarea>
                ) : (
                  <div onClick={() => onEdit(c)}>
                    <ReactMarkdown
                      components={{
                        code({ node, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || "")
                          return match ? (
                            <div
                              className="relative code flex fit-content"
                              /* onMouseEnter={handleMouseHoverCode}
                  onMouseLeave={handleMouseHoverCode}  */
                            >
                              <div className="flex gap-2 absolute right-0 top-1 text-xs overflow-visible whitespace-nowrap p-1 px-3 rounded mt-2">
                                <div className="tooltip-left tooltip" data-tip="Verify code (coming soon)">
                                  {used_icon_id === c.id + createHash({ str: String(children).replace(/\n$/, "") }) ? (
                                    <MdCheck />
                                  ) : (
                                    <MdContentCopy
                                      className="h-3 w-3 cursor-pointer hover:text-zinc-200 text-zinc-400"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        copyToClipboard(
                                          String(children).replace(/\n$/, ""),
                                          c.id + createHash({ str: String(children).replace(/\n$/, "") }),
                                          setUsedIcon
                                        )
                                        return false
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                              <SyntaxHighlighter
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
                    >
                      {c.data}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            )
          })}
        </>
      ) : (
        <div className="flex flex-col align-center items-center justify-center flex-grow text-zinc-600 font-semibold">
          <BiNotepad className="w-32 h-32" />
          This session has no notes saved
        </div>
      )}
    </div>
  )
}
