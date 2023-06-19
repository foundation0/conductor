import { useLoaderData, useParams } from "react-router-dom"
import _ from "lodash"
import { ClipboardsT } from "@/data/loaders/clipboard"
import { ClipboardS } from "@/data/schemas/clipboard"
import { useEffect, useState } from "react"
import { z } from "zod"
// @ts-ignore
import EasyEdit from "react-easy-edit"
import { MdCheck, MdClose, MdSaveAlt } from "react-icons/md"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import rehypeRaw from "rehype-raw"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { RxDotsHorizontal } from "react-icons/rx"

export default function Clipboard() {
  const { clipboard_state } = useLoaderData() as { clipboard_state: ClipboardsT }
  const session_id = useParams().session_id
  const [field_edit_id, setFieldEditId] = useState("")

  const [clipboard, setClipboard] = useState<z.infer<typeof ClipboardS> | undefined>(clipboard_state[session_id || ""])

  useEffect(() => {
    setClipboard(clipboard_state[session_id || ""])
  }, [JSON.stringify([clipboard_state, session_id])])

  const EditComponent = function (props: any) {
    return (
      <textarea
        onChange={(e) => {
          // @ts-ignore
          props.setParentValue(e.target.value)
        }}
        className="w-full text-zinc-200 rounded border-0 bg-transparent italic"
        value={props.value}
      />
    )
  }

  return (
    <div className="Clipboard flex flex-col px-3 pt-2 gap-2 w-full bg-zinc-800 border-l border-zinc-700 overflow-auto">
      <div className="flex flex-row text-zinc-300 text-sm font-semibold pb-1">
        <div className="flex-grow">Clipboard</div>
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
                    disabled={clipboard?.clips?.length || 0 > 0 ? false : true}
                    onClick={() => {}}
                  >
                    Copy to clipboard
                  </button>
                </DropdownMenu.Item>
                <DropdownMenu.Item className="text-xs pl-4 pr-6 py-2 outline-none  hover:text-zinc-200">
                  <button
                    className="outline-none"
                    disabled={clipboard?.clips?.length || 0 > 0 ? false : true}
                    onClick={() => {}}
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
      {clipboard?.clips?.length || 0 > 0 ? (
        <>
          {clipboard?.clips?.map((c) => {
            return (
              <div className="flex rounded-xl bg-zinc-900 px-4 py-3 text-xs" key={c.id}>
                <div className="">
                  {/* <EasyEdit
                type="text"
                onSave={(data: any) => {
                  setFieldEditId("")
                  // updateGroup({ group_id: group.id, name })
                }}
                onCancel={() => setFieldEditId("")}
                onBlur={() => setFieldEditId("")}
                cancelOnBlur={true}
                saveButtonLabel={<MdCheck className="w-3 h-3 text-zinc-200" />}
                cancelButtonLabel={<MdClose className="w-3 h-3  text-zinc-200" />}
                onHoverCssClass={``}
                value={<div style={{ whiteSpace: "pre-wrap" }}>{c.data.trim()}</div>}
                editComponent={<EditComponent />}
              /> */}
                  <div style={{ whiteSpace: "pre-wrap" }}>{c.data.trim()}</div>
                </div>
                {/* <div>
              <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeHighlight]}>{c.data.trim()}</ReactMarkdown>
            </div> */}
              </div>
            )
          })}
        </>
      ) : (
        <div className="flex flex-col align-center items-center justify-center flex-grow text-zinc-600 font-semibold">
          Clipboard is empty
        </div>
      )}
    </div>
  )
}
