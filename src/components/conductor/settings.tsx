import { useEffect, useState } from "react"
import { useLoaderData, useNavigate } from "react-router-dom"
import { UserT } from "@/data/loaders/user"
import UserActions from "@/data/actions/user"
import UsersActions from "@/data/actions/users"
import _ from "lodash"
// @ts-ignore
import EasyEdit from "react-easy-edit"
import { MdCheck, MdClose } from "react-icons/md"
import { z } from "zod"
import { getAddress, hex2buf } from "@/security/common"
import { HiPlus } from "react-icons/hi"
import { MdSettingsSuggest } from "react-icons/md"
import { ModuleSettings } from "@/components/conductor/module_settings"
import IntersectIcon from "@/assets/icons/intersect.svg"
import PersonaIcon from "@/assets/icons/persona.svg"

// function to detect numbers in strings
function isNumeric(str: string) {
  if (typeof str != "string") return false // we only process strings!
  // make sure it keeps integers and floats as floats
  return !isNaN(str as any) && !isNaN(parseFloat(str))
}

// parse floats into integers if they are whole numbers
function parseNumber(str: string) {
  if (typeof str != "string") return str // we only process strings!
  // make sure it keeps integers and floats as floats
  if (isNumeric(str)) {
    if (str.indexOf(".") !== -1) {
      return parseFloat(str)
    }
    return parseInt(str)
  }
  return str
}

export default function Settings() {
  const navigate = useNavigate()
  const { user_state } = useLoaderData() as { user_state: UserT }
  const [field_edit_id, setFieldEditId] = useState("")

  const handleEdit = async ({ value, name }: { value: string; name: string }) => {
    // field name is concatenated with . to denote nested fields
    const field_name = name.split(".")
    const field_value = parseNumber(value)
    const new_user_state = { ...user_state, ..._.set(user_state, field_name, field_value) }
    await UserActions.updateUser(new_user_state)

    // pass profile updates to local users list
    if (field_name[0] === "meta" && ["name"].indexOf(field_name[1]) !== -1) {
      const public_user = await UsersActions.getUser({ id: user_state.id })
      const updated_public_user = { ...public_user, [field_name[1]]: field_value }
      await UsersActions.updateUser(updated_public_user)
    }
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
      <div className="flex flex-col w-full justify-start items-start max-w-2xl">
        <div className="text-lg text-zinc-400 shadow font-semibold">Global Settings</div>

        <div className="text-xs text-zinc-400 shadow">version {version}</div>
        <hr className="w-full border-zinc-700 my-4" />
        <div className=" text-zinc-400 shadow font-semibold text-lg mb-3 w-full border-b border-b-zinc-700">
          Your profile
        </div>
        <div className="flex flex-col w-full gap-4 ">
          <div className="w-full">
            <div className="flex flex-row w-full gap-4 h-8">
              <div className="flex flex-grow items-center text-sm font-semibold text-zinc-300">Id</div>
              <div className="flex flex-grow text-end text-sm justify-end text-zinc-500 mr-2">
                {getAddress({ public_key: hex2buf({ input: user_state.public_key }) })}
              </div>
            </div>
          </div>
          <div className="w-full">
            <div className="flex flex-row w-full gap-4 h-8">
              <div className="flex flex-grow items-center text-sm font-semibold text-zinc-300">Username</div>
              <div className="flex flex-grow text-end text-sm justify-end text-zinc-500 mr-2">
                @{user_state.meta?.username}
              </div>
            </div>
          </div>
          <div className="w-full">
            <div className="flex flex-row w-full gap-4 h-8">
              <div className="flex flex-grow items-center text-sm font-semibold text-zinc-300">Display name</div>
              <div
                className="flex flex-grow text-end text-sm justify-center items-center "
                onClick={() => {
                  setFieldEditId("name")
                  return false
                }}
              >
                <EasyEdit
                  type="text"
                  onSave={(data: any) => {
                    setFieldEditId("")
                    handleEdit({ value: data, name: `meta.name` })
                  }}
                  onCancel={() => setFieldEditId("")}
                  onBlur={() => setFieldEditId("")}
                  cancelOnBlur={true}
                  saveButtonLabel={<MdCheck className="w-3 h-3 text-zinc-200" />}
                  cancelButtonLabel={<MdClose className="w-3 h-3  text-zinc-200" />}
                  onHoverCssClass={`cursor-pointer`}
                  value={user_state.meta?.name || "click to add"}
                  editComponent={<EditComponent />}
                />
              </div>
            </div>
          </div>
        </div>

        <div className=" text-zinc-400 shadow font-semibold text-lg mt-10 mb-3 w-full border-b border-b-zinc-700">
          Modules
        </div>
        <div className="flex flex-row w-full gap-2">
          {user_state?.modules.installed?.map((module: any, index: number) => {
            return (
              <div key={module.id} className="w-1/2 bg-zinc-800 rounded-xl p-5 border-t border-t-zinc-600/50">
                <div className="flex w-full mb-2 pb-2 border-b border-b-zinc-700">
                  <div className="flex items-center text-zinc-400 font-semibold">{module.meta.vendor.name}</div>

                  <div className="flex flex-1 items-center justify-end">
                    <MdSettingsSuggest
                      className="w-4 h-4 text-zinc-400 hover:text-zinc-300 cursor-pointer"
                      onClick={() => {
                        // @ts-ignore
                        window[`settings-${module.id}`].showModal()
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center text-zinc-400 font-semibold text-xs mb-3">
                  {module.meta.description || "No description"}
                </div>
                <div className="flex flex-col w-full gap-1" data-id={`${module.id}-apikey`}>
                  <div className="flex flex-grow items-center text-sm font-bold text-zinc-400">
                    {module.vendor} {module.name} API key
                  </div>
                  <div
                    className="flex flex-grow w-full text-sm "
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

                <ModuleSettings {...{ module, index, setFieldEditId, handleEdit, EditComponent }} />
              </div>
            )
          })}
          <div
            className="w-1/2 bg-zinc-900 rounded-lg p-3 flex flex-col justify-center items-center cursor-not-allowed border-zinc-700 border border-dashed text-zinc-600 hover:bg-zinc-850 hover:text-zinc-500 hover:border-zinc-500 tooltip tooltip-top"
            data-tip="Coming soon"
          >
            {/* <HiPlus className="w-8 h-8 rounded-full border border-dashed border-zinc-600 m-2 p-1" /> */}
            <img
              src={IntersectIcon}
              className="w-10 h-10 rounded-full border-2 border-dashed border-zinc-700 m-2 p-1 saturate-0 hover:saturate-50"
            />
            <div className="text-xs font-semibold">Add module</div>
          </div>
        </div>
        <div className=" text-zinc-400 shadow font-semibold text-lg mt-10 mb-3 w-full border-b border-b-zinc-700">
          Personas <span className="text-xs text-zinc-500">(Coming soon&trade;)</span>
        </div>
        <div className="flex flex-row w-full gap-2">
          <div
            className="w-1/2 bg-zinc-900 rounded-lg p-3 flex flex-col justify-center items-center cursor-not-allowed border-zinc-700 border border-dashed text-zinc-600 hover:bg-zinc-850 hover:text-zinc-500 hover:border-zinc-500 tooltip tooltip-top"
            data-tip="Coming soon"
          >
            {/* <HiPlus className="w-10 h-10 rounded-full border-2 border-dashed border-zinc-700 m-2 p-1" /> */}
            <img
              src={PersonaIcon}
              className="w-10 h-10 rounded-full border-2 border-dashed border-zinc-700 m-2 p-1 saturate-0 hover:saturate-50"
            />
            <div className="text-xs font-semibold">Create persona</div>
          </div>
          <div
            className="w-1/2 bg-zinc-900 rounded-lg p-3 flex flex-col justify-center items-center cursor-not-allowed border-zinc-700 border border-dashed text-zinc-600 hover:bg-zinc-850 hover:text-zinc-500 hover:border-zinc-500 tooltip tooltip-top"
            data-tip="Coming soon"
          >
            <img
              src={IntersectIcon}
              className="w-10 h-10 rounded-full border-2 border-dashed border-zinc-700 m-2 p-1 saturate-0 hover:saturate-50"
            />
            <div className="text-xs font-semibold">Add persona</div>
          </div>
        </div>
      </div>
    </div>
  )
}
