import { useEvent } from "@/components/hooks/useEvent"
import useMemory from "@/components/hooks/useMemory"
import { Match, Switch } from "react-solid-flow"
import _ from "lodash"
import { MdClose } from "react-icons/md"
import { mPricesT } from "@/data/schemas/memory"
import { BiRightArrowAlt } from "react-icons/bi"
import { HiPlus } from "react-icons/hi"
import { Form } from "react-router-dom"
import { emit } from "@/libraries/events"
import { error } from "@/libraries/logging"
import CabinetIcon from "@/assets/icons/cabinet.svg"

type AddDataClipT = {
  file: {
    name: string
  }
  mime: string
  content: string
  workspace_id: string
}

export function AddData() {
  const initial = {
    file: { name: "" },
    mime: "",
    content: "",
    workspace_id: "",
  }

  const mem_add_data = useMemory<{
    data: AddDataClipT
    form: {
      name: string
    }
  }>({
    id: "add-data",
    state: {
      data: initial,
      form: {
        name: "",
      },
    },
  })

  useEvent({
    name: "AddData/show",
    action: (data: AddDataClipT) => {
      if (
        !_.isEmpty(data) &&
        (!data.workspace_id || !data.file.name || !data.mime || !data.content)
      ) {
        return error({ message: "Invalid notepad clip" })
      }
      mem_add_data.data = data

      // open modal
      const dialog = document.getElementById("AddData") as HTMLDialogElement
      dialog?.showModal()
    },
  })

  async function onAddData() {
    if (
      !mem_add_data.data.workspace_id ||
      !mem_add_data.data.file.name ||
      !mem_add_data.data.mime ||
      !mem_add_data.data.content
    ) {
      return error({ message: "Invalid notepad clip" })
    }
    mem_add_data.data.file.name = mem_add_data.form.name
    emit({
      type: "data.import",
      data: mem_add_data.data,
    })
    mem_add_data.data = initial
    mem_add_data.form = {
      name: "",
    }
    emit({
      type: "workspace/changeSidebarTab",
      data: {
        sidebar_tab: "data",
      },
    })
    const dialog = document.getElementById("AddData") as HTMLDialogElement
    dialog.close()
  }

  return (
    <dialog
      id="AddData"
      className="ModuleSetting modal w-full w-max-4xl h-max-[80dvh]"
    >
      <div className="modal-box bg-zinc-800/95 border-t border-t-zinc-600 relative">
        <div className="absolute right-3 top-3">
          <MdClose
            className="cursor-pointer h-3 w-3 text-zinc-300 transition-all hover:text-zinc-100 hover:bg-zinc-700 rounded-full"
            onClick={() => {
              const dialog = document.getElementById(
                "AddData",
              ) as HTMLDialogElement
              dialog.close()
            }}
          />
        </div>
        <div className="flex flex-col flex-grow justify-center items-center ">
          <div className="flex flex-col w-full">
            <div className="flex flex-row mb-5">
              {/* <div className="flex flex-shrink-0 items-center mr-4 justify-center w-28 h-28 p-0 px-0 rounded-3xl cursor-pointer border-zinc-700 border-2 border-dashed text-zinc-600 hover:bg-zinc-850 hover:text-zinc-500 hover:border-zinc-500">
                <HiPlus className="w-8 h-8 " />
              </div> */}
              <div className="flex flex-row justify-center align-center items-center">
                <img src={CabinetIcon} className="w-6 h-6" />
                <div className="text-xl font-semibold ml-2">
                  What should we call this data?
                </div>
              </div>
            </div>
            <form
              className="flex flex-col justify-center items-center w-full"
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onAddData()
              }}
            >
              <label className="flex flex-row w-full backdrop-blur bg-zinc-700/30 bg-opacity-80 border border-zinc-900 border-t-zinc-700 rounded-lg items-center">
                <input
                  type="text"
                  name="name"
                  placeholder="Name"
                  className="flex flex-1 p-4 py-3 bg-transparent text-xs border-0 rounded  placeholder-zinc-400 text-zinc-300 outline-none focus:outline-none ring-0 shadow-transparent input"
                  autoComplete="off"
                  // defaultValue={mem_add_data.form.name}
                  value={mem_add_data.form.name}
                  onChange={(e) => {
                    mem_add_data.form.name = e.target.value
                  }}
                />
                <button
                  type="submit"
                  className="lex inset-y-0 right-0 m-1 focus:outline-none font-medium rounded-lg text-sm px-2 text-zinc-400 hover:text-zinc-200 py-2 saturate-50 hover:saturate-100 animate"
                >
                  <BiRightArrowAlt className="float-right w-5 h-5" />
                </button>
              </label>
            </form>
          </div>
        </div>
      </div>
    </dialog>
  )
}
