import { useEffect, useState } from "react"
import { useFetcher, useLoaderData, useNavigate, useParams } from "react-router-dom"
import { UserT } from "@/data/loaders/user"
import UserActions from "@/data/actions/user"
import _ from "lodash"
// @ts-ignore
import EasyEdit from "react-easy-edit"
import { MdCheck, MdClose } from "react-icons/md"
import generateLLMModuleOptions from "@/components/libraries/generateLLMModuleOptions"

export default function Settings() {
  const navigate = useNavigate()
  const { user_state } = useLoaderData() as { user_state: UserT }
  const [field_edit_id, setFieldEditId] = useState("")
  const workspace_id = useParams().workspace_id as string
  const [workspace, setWorkspace] = useState(user_state.workspaces.find((w) => w.id === workspace_id))
  const [workspace_i, setWorkspace_i] = useState(0)

  const fetcher = useFetcher()

  // update workspace
  useEffect(() => {
    if (workspace_id) {
      setWorkspace(user_state.workspaces.find((w) => w.id === workspace_id))
      setWorkspace_i(user_state.workspaces.findIndex((w) => w.id === workspace_id))
    }
  }, [JSON.stringify([workspace_id, user_state.workspaces])])

  const handleEdit = async ({ value, name, is_json }: { value: string; name: string; is_json?: boolean }) => {
    // field name is concatenated with . to denote nested fields
    const field_name = name.split(".")
    const field_value = is_json ? JSON.parse(value) : value
    const new_user_state = { ...user_state, ..._.set(user_state, field_name, field_value) }
    await UserActions.updateUser(new_user_state)
    navigate(`/conductor/${workspace_id}/settings`)
  }

  const EditComponent = function (props: any) {
    return (
      <input
        onChange={(e) => {
          // @ts-ignore
          props.setParentValue(e.target.value)
        }}
        className="w-full text-zinc-200 rounded border-0 bg-transparent italic"
        value={props.value}
      />
    )
  }

  useEffect(() => {
    if (field_edit_id) {
      setTimeout(() => {
        const e: HTMLInputElement | null = document.querySelector(`div[data-id="${field_edit_id}"] input`)
        if (e) {
          e.focus()
          e.select()
        }
      }, 100)
    }
  }, [field_edit_id])
  if (!workspace) return null

  const saveButton = <MdCheck className="w-3 h-3 text-zinc-200" />
  const cancelButton = <MdClose className="w-3 h-3  text-zinc-200" />

  return (
    <div className="Settings flex flex-col flex-grow items-center m-10">
      <div className="flex flex-col w-full justify-start items-start">
        <div className="text-lg text-zinc-400 shadow font-semibold">{workspace.name} settings</div>
        <hr className="w-full border-zinc-700 my-4" />

        <div className=" text-zinc-400 shadow font-semibold text-lg mb-3">Details</div>

        <div className="flex flex-row w-full gap-4" data-id={`${workspace.id}-name`}>
          <div className="flex flex-grow items-center text-sm font-semibold text-zinc-300">Name</div>
          <div
            className="flex flex-grow text-end text-sm "
            onClick={() => {
              setFieldEditId(`${workspace.id}-name`)
              return false
            }}
          >
            <EasyEdit
              type="text"
              onSave={(data: any) => {
                setFieldEditId("")
                handleEdit({ value: data, name: `workspaces.${workspace_i}.name` })
              }}
              onCancel={() => setFieldEditId("")}
              onBlur={() => setFieldEditId("")}
              cancelOnBlur={true}
              saveButtonLabel={saveButton}
              cancelButtonLabel={cancelButton}
              onHoverCssClass={`cursor-pointer`}
              value={workspace.name || "click to add name"}
              editComponent={<EditComponent />}
            />
          </div>
        </div>
        <div className="flex flex-row w-full gap-4" data-id={`${workspace.id}-defaults-llm-module`}>
          <div className="flex flex-grow items-center text-sm font-semibold text-zinc-300">Default LLM module</div>
          <div
            className="flex flex-grow text-end text-sm "
            onClick={() => {
              setFieldEditId(`${workspace.id}-defaults-llm-module`)
              return false
            }}
          >
            <select
              className="border rounded-lg block w-full p-2 bg-zinc-800 border-zinc-700 placeholder-zinc-400 text-white text-xs"
              defaultValue={
                workspace.defaults?.llm_module?.id
                  ? `{"id": "${workspace.defaults?.llm_module?.id}", "variant": "${workspace.defaults?.llm_module?.variant}"}`
                  : "click to select"
              }
              onChange={(data) => {
                handleEdit({
                  value: data.target.value,
                  name: `workspaces.${workspace_i}.defaults.llm_module`,
                  is_json: true,
                })
              }}
            >
              {generateLLMModuleOptions({ user_state })}
            </select>
          </div>
        </div>

        <div className=" text-zinc-400 shadow font-semibold text-lg mb-3 mt-8">Destructive actions</div>
        <div className="flex flex-row w-full gap-4" data-id={`${workspace.id}-delete-workspace`}>
          <div className="flex flex-grow items-center text-sm font-semibold text-zinc-300">
            Delete workspace (can't be undone)
          </div>
          <div className="flex flex-grow text-end text-sm justify-end">
            <button
              className={`bg-red-800 hover:bg-red-700 text-zinc-50 rounded-lg block px-3 py-2 text-xs font-semibold cursor-pointer ${
                user_state.workspaces.length === 1 ? "disabled" : ""
              }`}
              disabled={user_state.workspaces.length === 1}
              title={user_state.workspaces.length === 1 ? "Can't delete last workspace" : ""}
              onClick={() => {
                if (user_state.workspaces.length === 1) return null
                if (!confirm(`Are you sure you want to delete ${workspace.name}? This can't be undone.`)) return null
                fetcher.submit(
                  {
                    workspace_id,
                  },
                  {
                    method: "DELETE",
                    action: `/conductor/workspace`,
                  }
                )
              }}
            >
              Delete workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
