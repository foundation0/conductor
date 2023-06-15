import { useEffect, useState } from "react"
import { useLoaderData, useNavigate } from "react-router-dom"
import { UserT } from "@/data/loaders/user"
import UserActions from "@/data/actions/user"
import _ from "lodash"
// @ts-ignore
import EasyEdit from "react-easy-edit"
import { MdCheck, MdClose } from "react-icons/md"
import { z } from "zod"

export default function Settings() {
  const navigate = useNavigate()
  const { user_state } = useLoaderData() as { user_state: UserT }
  const [openai_api_key, setOpenaiApiKey] = useState<string>(window?.localStorage?.getItem("openai_api_key") || "")
  const [field_edit_id, setFieldEditId] = useState("")

  const handleEdit = async ({ value, name }: { value: string; name: string }) => {
    // field name is concatenated with . to denote nested fields
    const field_name = name.split(".")
    const field_value = value
    const new_user_state = { ...user_state, ..._.set(user_state, field_name, field_value) }
    await UserActions.updateUser(new_user_state)
    navigate("/conductor/settings")
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
  // @ts-ignore
  const version = __APP_VERSION__ || "// dev build"
  return (
    <div className="Settings flex flex-col flex-grow items-center m-10">
      <div className="flex flex-col w-full justify-start items-start">
        <div className="text-lg text-zinc-400 shadow font-semibold">Global Settings</div>

        <div className="text-xs text-zinc-400 shadow">version {version}</div>
        <hr className="w-full border-zinc-700 my-4" />

        <div className=" text-zinc-400 shadow font-semibold text-lg mb-3">Modules</div>
        {user_state?.modules.installed?.map((module: any, index: number) => {
          return (
            <div key={module.id} className="w-full">
              <div className=" text-zinc-400 shadow font-semibold">{module.meta.vendor.name}</div>

              <div className="flex flex-row w-full gap-4" data-id={`${module.id}-apikey`}>
                <div className="flex flex-grow items-center text-sm font-semibold text-zinc-300">
                  {module.vendor} {module.name} API key
                </div>
                <div
                  className="flex flex-grow text-end text-sm "
                  onClick={() => {
                    setFieldEditId(`${module.id}-apikey`)
                    return false
                  }}
                >
                  <EasyEdit
                    type="text"
                    onSave={(data: any) => {
                      setFieldEditId("")
                      handleEdit({ value: data, name: `modules.installed.${index}.settings.api_key` })
                    }}
                    onCancel={() => setFieldEditId("")}
                    onBlur={() => setFieldEditId("")}
                    cancelOnBlur={true}
                    saveButtonLabel={<MdCheck className="w-3 h-3 text-zinc-200" />}
                    cancelButtonLabel={<MdClose className="w-3 h-3  text-zinc-200" />}
                    onHoverCssClass={`cursor-pointer`}
                    value={module.settings.api_key || "click to add api key"}
                    editComponent={<EditComponent />}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
