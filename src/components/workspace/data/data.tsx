import { DataTypesBinaryT, DataTypesTextT } from "@/data/schemas/data_types"
import { getIcon } from "material-file-icons"
import { ReactElement, useEffect, useState } from "react"
import { MdCheck, MdClose, MdDelete, MdDeleteForever, MdDeleteOutline } from "react-icons/md"
import { RxDotsHorizontal, RxPlus } from "react-icons/rx"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import _ from "lodash"
import { emit, listen } from "@/libraries/events"
// @ts-ignore
import EasyEdit from "react-easy-edit"
import useMemory from "@/components/hooks/useMemory"
import { useEvent } from "@/components/hooks/useEvent"
import { mAppT } from "@/data/schemas/memory"

export default function Data({
  id,
  name,
  mime,
  progress,
  isLoading = false,
  onClick = () => {},
  onRemove = () => {},
  removeIcon,
  removeTooltip,
  menu,
}: {
  id: string
  name: string
  mime: DataTypesTextT | DataTypesBinaryT
  progress?: number
  isLoading?: boolean
  onClick?: Function
  onRemove?: Function
  removeIcon?: ReactElement
  removeTooltip?: string
  menu?: { label: string; callback: Function }[]
}) {
  const [pr, setPr] = useState(progress)

  const mem_app = useMemory<mAppT>({ id: "app" })
  const mem_data = useMemory<{
    field_edit: boolean
  }>({ id: `data-${id}`, state: { field_edit: false } })

  const { field_edit } = mem_data

  useEffect(() => {
    const stop_data_import_progress_listener = listen({
      type: "data-import/progress",
      action: ({ name: n, progress }: { name: string; progress: number }) => {
        // console.log(n, progress)
        if (n === name) setPr(progress)
      },
    })
    return () => {
      stop_data_import_progress_listener()
    }
  }, [])

  useEffect(() => {
    if (mem_data.field_edit) {
      setTimeout(() => {
        const e: HTMLInputElement | null = document.querySelector(
          `div[data-id="${id}"] input`,
        )
        if (e) {
          e.focus()
          e.select()
        }
      }, 100)
    }
  }, [mem_data.field_edit])

  useEvent({
    name: 'data/toggle_edit',
    target: id,
    action: () => {
      mem_data.field_edit = true //!mem_data.field_edit
    }
  })
  return (
    <div
      className={`flex flex-1 flex-row justify-center align-center gap-1 p-1 border border-transparent text-zinc-400 ${
        !isLoading &&
        "hover:bg-zinc-900/50 hover:border-zinc-900 hover:border-t-zinc-700/70 hover:text-zinc-100"
      } rounded transition-all`}
      data-id={id}
    >
      <div className="flex flex-shrink-0">
        <div
          dangerouslySetInnerHTML={{ __html: getIcon(name).svg }}
          className="h-4"
        ></div>
      </div>

      <div
        className="flex flex-1 overflow-x-hidden text-xs h-4 truncate font-semibold text-ellipsis ph-no-capture transition-all"
        onClick={() => {
          !mem_data.field_edit && onClick({ id, name, mime })
        }}
      >
        <EasyEdit
          type="text"
          editMode={mem_data.field_edit}
          onSave={(value: any) => {
            if(value === name) return
            emit({
              type: 'data.rename',
              data: {
                id,
                name: value
              }
            })
            emit({
              type: 'user.renameDataInWorkspace',
              data: {
                workspace_id: mem_app.workspace_id,
                data_id: id,
                name: value
              }
            })
            mem_data.field_edit = false
          }}
          onCancel={() => mem_data.field_edit = false}
          onBlur={() => mem_data.field_edit = false}
          cancelOnBlur={true}
          saveButtonLabel={<MdCheck className="w-3 h-3 text-zinc-200" />}
          cancelButtonLabel={<MdClose className="w-3 h-3 text-zinc-200" />}
          onHoverCssClass={``}
          value={name}
          allowEdit={false}
          editComponent={(props: any) => (
            <input
              onChange={(e) => {
                // @ts-ignore
                props.setParentValue(e.target.value)
              }}
              className="w-full text-zinc-200 rounded border-0 bg-transparent italic"
              value={props.value}
            />
          )}
        />
        {/* <div
          className={`${
            !isLoading && "cursor-pointer"
          } text-xs truncate font-semibold text-ellipsis ph-no-capture transition-all`}
        >
          
        </div> */}
      </div>
      {isLoading && (
        <div className="flex justify-start align-start text-xs">
          {pr ? _.round(pr * 100) : 0}%
        </div>
      )}
      {!isLoading && !mem_data.field_edit && (
        <div className="flex flex-shrink justify-end gap-2 ml-2">
          {menu && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="">
                  <RxDotsHorizontal className="w-3 h-3" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-md shadow-lg shadow-zinc-900 outline-none"
                  side="bottom"
                >
                  {menu.map((item, i) => (
                    <DropdownMenu.Item
                      key={`menu-${i}`}
                      className="text-xs pl-4 pr-6 py-2 outline-none cursor-pointer hover:text-zinc-200"
                      onClick={() => item.callback()}
                    >
                      {item.label}
                    </DropdownMenu.Item>
                  ))}
                  <DropdownMenu.Arrow className="fill-zinc-600 border-zinc-600" />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
          <div
            className="flex flex-col justify-center align-center cursor-pointer"
            onClick={() => onRemove(id)}
          >
            <div className="tooltip" data-tip={removeTooltip || "Remove item"}>
              {removeIcon || <MdDeleteForever className="w-3 h-3" />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
