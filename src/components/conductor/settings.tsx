import { useEffect, useState, useCallback } from "react"
import { useLoaderData, useNavigate, Link } from "react-router-dom"
import { UserT } from "@/data/loaders/user"
import UserActions from "@/data/actions/user"
import UsersActions from "@/data/actions/users"
import _ from "lodash"
import EasyEdit from "react-easy-edit"
import { MdCheck, MdClose, MdSettingsSuggest, MdOutlineAddAPhoto, MdOutlineRemoveCircle } from "react-icons/md"
import { getAddress, hex2buf } from "@/security/common"
import IntersectIcon from "@/assets/icons/intersect.svg"
import PersonaIcon from "@/assets/icons/persona.svg"
import { useDropzone } from "react-dropzone"
import { error } from "@/libraries/logging"
import { useAuth } from "@/components/hooks/useAuth"
import { AIsT } from "@/data/schemas/ai"
import AIActions from "@/data/actions/ai"
import { getAvatar } from "@/libraries/ai"
import { RiAddCircleFill } from "react-icons/ri"
import { LuSettings2 } from "react-icons/lu"
import { BiBlock } from "react-icons/bi"
import { parseBoolean, parseNumber } from "@/libraries/utilities"
import { getBalance, getFreeBalance, getWalletStatus } from "@/components/user/wallet"
import { ModuleSettings } from "./module_settings"
import { buyCreditsWithStripe } from "@/libraries/payments"
import { getModules } from "@/modules"
import { get as getLS } from "@/data/storage/localStorage"

export default function Settings(props: any) {
  const navigate = useNavigate()
  let auth = useAuth()
  const { user_state, ai_state } = useLoaderData() as { user_state: UserT; ai_state: AIsT }
  const [field_edit_id, setFieldEditId] = useState("")
  const [balance, setBalance] = useState<number | string>("loading...")
  const [wallet_status, setWalletStatus] = useState<string>("loading...")

  const [module_list, setModuleList] = useState<any[]>([])

  // initialization
  useEffect(() => {
    getBalance({ public_key: user_state.public_key, master_key: user_state.master_key }).then((balance) => {
      setBalance(balance)
    })
    getWalletStatus({ public_key: user_state.public_key, master_key: user_state.master_key }).then((wallet_status) => {
      setWalletStatus(wallet_status)
    })
    // getFreeBalance({ public_key: user_state.public_key, master_key: user_state.master_key }).then((free_balance) => {
    //   console.log("free balance", free_balance)
    // })
    updateModules()
  }, [])

  const updateModules = async () => {
    const mods = await getModules()
    setModuleList(mods)
  }
  const handleEdit = async ({ value, name, module_id }: { value: string; name: string; module_id?: string }) => {
    // field name is concatenated with . to denote nested fields
    let field_name = name.split(".")
    const field_value = parseNumber(parseBoolean(value))
    if (module_id) {
      const index = _.findIndex(user_state.modules.installed, { id: module_id })
      field_name = [`modules`, `installed`, index.toString(), ...field_name]
    }
    const new_user_state = { ...user_state, ..._.set(user_state, field_name, field_value) }
    await UserActions.updateUser(new_user_state)

    // pass profile updates to local users list
    if (field_name[0] === "meta" && ["name", "profile_photos"].indexOf(field_name[1]) !== -1) {
      const public_user = await UsersActions.getUser({ id: user_state.id })
      const f_name = field_name.slice(1).join(".")
      const updated_public_user = _.set(public_user, f_name, field_value)
      await UsersActions.updateUser(updated_public_user)
    }
    updateModules()
    navigate("/c/settings")
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

  const onDrop = useCallback((acceptedFiles: any, fileRejections: any) => {
    if (fileRejections.length > 0) {
      fileRejections.map(({ file, errors }: any) => {
        return error({
          message: `File ${file.name} was rejected: ${errors.map((e: any) => e.message).join(", ")}`,
          data: errors,
        })
      })
    } else {
      const reader = new FileReader()

      reader.onabort = () => console.log("file reading was aborted")
      reader.onerror = () => console.log("file reading has failed")
      reader.onload = () => {
        // Do whatever you want with the file contents
        const data_url = reader.result as string
        if (!data_url) return
        handleEdit({ value: data_url, name: `meta.profile_photos.0` })
      }
      reader.readAsDataURL(acceptedFiles[0] as any)
    }
  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 2,
    maxSize: 1000000,
    accept: {
      "image/png": [".png", ".jpg", ".jpeg", ".gif"],
    },
  })

  // @ts-ignore
  const version = import.meta.env.PROD ? __APP_VERSION__ : "// dev build"
  return (
    <div className="Settings content flex flex-col flex-grow items-center m-10 mb-0">
      <div className="flex flex-col w-full justify-start items-start max-w-2xl">
        <div className="text-lg text-zinc-400 shadow font-semibold">Global Settings</div>

        <div className="text-xs text-zinc-400 shadow">version {version}</div>
        <hr className="w-full border-zinc-700 my-4" />
        <div className=" text-zinc-400 shadow font-semibold text-lg mb-3 w-full border-b border-b-zinc-700">
          Your profile
        </div>
        <div className="flex flex-row w-full">
          <div className="flex flex-col flex-shrink mr-4">
            <div
              {...getRootProps()}
              className="relative flex w-20 h-20 rounded-full bg-zinc-800/80 border-t border-t-zinc-700 justify-center items-center overflow-hidden text-2xl font-bold text-zinc-500 mb-2"
            >
              {_.size(user_state.meta?.profile_photos) > 0 && (
                <img src={_.first(user_state.meta?.profile_photos) || ""} className="object-cover h-full" />
              )}
              <input {...getInputProps()} />
              <MdOutlineAddAPhoto className="absolute opacity-80 hover:opacity-100 text-zinc-200 w-5 h-5 cursor-pointer" />
            </div>
            <button
              className={`bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 rounded-lg block px-2 py-1.5 text-xs font-semibold cursor-pointer`}
              onClick={() => {
                auth.signout(() => {
                  navigate("/c/authenticate")
                })
              }}
            >
              Logout
            </button>
          </div>
          <div className="flex flex-grow flex-1">
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
                    className="flex flex-grow text-end text-sm justify-center items-center mr-2"
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
                      onHoverCssClassName={`cursor-pointer`}
                      value={user_state.meta?.name || user_state.meta?.username || "click to add"}
                      editComponent={<EditComponent />}
                    />
                  </div>
                </div>
              </div>
              <div className="w-full">
                <div className="flex flex-row w-full gap-4 h-8">
                  <div className="flex flex-grow items-center text-sm font-semibold text-zinc-300">Email</div>
                  <div
                    className="flex flex-grow text-end text-sm justify-center items-center mr-2"
                    onClick={() => {
                      setFieldEditId("email")
                      return false
                    }}
                  >
                    <EasyEdit
                      type="text"
                      onSave={(data: any) => {
                        setFieldEditId("")
                        handleEdit({ value: data, name: `meta.email` })
                      }}
                      onCancel={() => setFieldEditId("")}
                      onBlur={() => setFieldEditId("")}
                      cancelOnBlur={true}
                      saveButtonLabel={<MdCheck className="w-3 h-3 text-zinc-200" />}
                      cancelButtonLabel={<MdClose className="w-3 h-3  text-zinc-200" />}
                      onHoverCssClassName={`cursor-pointer`}
                      value={user_state.meta?.email || "click to add"}
                      editComponent={<EditComponent />}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className=" text-zinc-400 shadow font-semibold text-lg mt-10 mb-3 w-full border-b border-b-zinc-700">
          Credits
        </div>
        <div className="flex flex-row w-full gap-2">
          <div className="flex flex-col w-full gap-4 ">
            <div className="w-full">
              <div className="flex flex-row w-full gap-4 h-8">
                <div className="flex flex-grow items-center text-sm font-semibold text-zinc-300">Status</div>
                <div className="flex flex-grow text-end text-sm justify-end text-zinc-500 mr-2">{wallet_status === "no_wallet" ? "waiting for funds" : wallet_status}</div>
              </div>
            </div>
            <div className="w-full">
              <div className="flex flex-row w-full gap-4 h-8">
                <div className="flex flex-grow items-center text-sm font-semibold text-zinc-300">
                  Current balance{" "}
                  <span
                    className="text-xs ml-3 link text-blue-400 hover:text-blue-100 transition-all cursor-pointer"
                    onClick={async () => {
                      if(getLS({ key: "guest-mode"})) return (window as any)["ConvertGuest"].showModal()
                      const { error: err } = (await buyCreditsWithStripe({ user_id: user_state.id })) as any
                      if (err) {
                        console.error(err)
                        error({ message: "Something went wrong, we are investigating..." })
                      }
                    }}
                  >
                    Buy credits
                  </span>
                </div>
                <div className="flex flex-grow text-end text-sm justify-end text-zinc-500 mr-2">
                  {_.isNumber(balance) ? `$${balance}` : balance}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className=" text-zinc-400 shadow font-semibold text-lg mt-10 mb-3 w-full border-b border-b-zinc-700">
          Modules
        </div>
        <div className="flex flex-row w-full gap-2">
          {module_list
            ?.filter((m) => m.meta?.type.toLowerCase() === "llm")
            //?.filter((m) => _.find(module_list, { id: m.id }))
            .map((module: any, index: number) => {
              return (
                <div
                  key={module.id}
                  className="w-1/2 bg-zinc-800/50 bg-gradient rounded-xl p-5 border-t border-t-zinc-600/50"
                >
                  <div className="flex w-full mb-2 pb-2 border-b border-b-zinc-700">
                    <div className="flex items-center text-zinc-400 font-semibold">
                      {module.meta?.vendor?.name || "Unknown"}{" "}
                    </div>
                    <div className="flex flex-1 items-center justify-end gap-2">
                      <label
                        className="relative inline-flex items-center cursor-pointer tooltip tooltip-top"
                        data-tip="Active/inactive module"
                      >
                        <input
                          type="checkbox"
                          onChange={() => {
                            handleEdit({
                              module_id: module.id,
                              value: module.active ? "false" : "true",
                              name: "active",
                            })
                          }}
                          checked={module.active ? true : false}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
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
                    {module.meta?.description || "No description"}
                  </div>

                  <ModuleSettings {...{ module, index: index - 1, setFieldEditId, handleEdit, EditComponent }} />
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
            <div className="text-xs font-semibold">Browser module marketplace</div>
          </div>
        </div>
        <div className=" text-zinc-400 shadow font-semibold text-lg mt-10 mb-3 w-full border-b border-b-zinc-700">
          AIs
        </div>
        <div className="flex flex-grow flex-1 w-full flex-col gap-3">
          <div className="flex flex-row w-full gap-2">
            <Link
              to="/c/ai/create"
              className="w-1/2 bg-zinc-900 rounded-lg p-3 flex flex-col justify-center items-center border-zinc-700 border border-dashed text-zinc-600 hover:bg-zinc-850 hover:text-zinc-500 hover:border-zinc-500 tooltip tooltip-top saturate-0 hover:saturate-100"
              data-tip="Create a new AI"
            >
              <img
                src={PersonaIcon}
                className="w-10 h-10 rounded-full border-2 border-dashed border-zinc-700 m-2 p-1 "
              />
              <div className="text-xs font-semibold">Create AI</div>
            </Link>
            <div
              className="w-1/2 bg-zinc-900 rounded-lg p-3 flex flex-col justify-center items-center cursor-not-allowed border-zinc-700 border border-dashed text-zinc-600 hover:bg-zinc-850 hover:text-zinc-500 hover:border-zinc-500 tooltip tooltip-top"
              data-tip="Coming soon"
            >
              <img
                src={IntersectIcon}
                className="w-10 h-10 rounded-full border-2 border-dashed border-zinc-700 m-2 p-1 saturate-0 hover:saturate-50"
              />
              <div className="text-xs font-semibold">Browse AI marketplace</div>
            </div>
          </div>
          <div className="flex flex-col w-full gap-2 bg-zinc-800/50 bg-gradient rounded-xl p-5 border-t border-t-zinc-600/50">
            <div className="flex text-md font-semibold text-zinc-300">Installed AIs</div>
            <ul className="w-full divide-y divide-gray-700">
              {_(user_state?.ais)
                .orderBy((ai) => _.find(ai_state, { id: ai.id })?.meta.name)
                .map((installed_ai: any, index: number) => {
                  let ai = _.find(ai_state, { id: installed_ai.id })
                  if (!ai)
                    ai = {
                      id: installed_ai.id,
                      status: "not_installed",
                      meta: {
                        name: "Unknown AI",
                        description: "This AI is not installed",
                      },
                    } as any
                  if (!ai) return null
                  return (
                    <li className="py-3" key={`ai-user-${ai.id}`}>
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <img className="w-8 h-8 rounded-full" src={getAvatar({ seed: ai?.meta?.name || "" })} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-zinc-200">{ai?.meta.name}</p>
                          <p className="text-xs text-gray-500 truncate dark:text-gray-400">{ai?.meta.description}</p>
                        </div>
                        <div className="inline-flex items-center text-base font-semibold text-zinc-400">
                          {ai?.id !== "c1" && (
                            <div className="inline-flex items-center gap-3">
                              <Link
                                to={`/c/ai/edit/${ai.id}`}
                                className="flex items-center tooltip tooltip-top"
                                data-tip="Modify AI"
                              >
                                <button>
                                  <LuSettings2 className="w-4 h-4 hover:text-zinc-200" />
                                </button>
                              </Link>
                              <button
                                className="flex items-center tooltip tooltip-top"
                                data-tip="Uninstall AI"
                                onClick={async () => {
                                  if (ai?.id && confirm("Are you sure you want to uninstall this AI?")) {
                                    await UserActions.updateUser({
                                      ...user_state,
                                      ais: _.filter(user_state.ais, (a) => a.id !== ai?.id),
                                    })
                                    navigate("/c/settings")
                                  }
                                }}
                              >
                                <MdOutlineRemoveCircle className="w-4 h-4 hover:text-zinc-200" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })
                .value()}
            </ul>
          </div>
          <div className="flex  flex-col w-full gap-2 bg-zinc-800/50 bg-gradient rounded-xl p-5 border-t border-t-zinc-600/50">
            <div className="flex text-md font-semibold text-zinc-300">Available AIs</div>
            <ul className="w-full divide-y divide-gray-700">
              {_(ai_state)
                .orderBy("meta.name")
                .map((ai: any, index: number) => {
                  if (!ai) return null
                  return (
                    <li className="py-3" key={`ai-store-${ai.id}`}>
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <img className="w-8 h-8 rounded-full" src={getAvatar({ seed: ai?.meta?.name || "" })} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-zinc-200">{ai?.meta.name}</p>
                          <p className="text-xs text-gray-500 truncate dark:text-gray-400">{ai?.meta.description}</p>
                        </div>
                        {ai.id !== "c1" && (
                          <div className="inline-flex gap-3 items-center justify-center text-base font-semibold text-zinc-400">
                            <button
                              className="flex items-center tooltip tooltip-top"
                              data-tip="Install AI"
                              onClick={async () => {
                                if (ai?.id) {
                                  const user_ai: { id: string; status: "active" | "inactive" } = {
                                    id: ai?.id,
                                    status: "active",
                                  }
                                  // add AI to user_state.ais if it's not already there
                                  if (!user_state.ais?.find((a) => a.id === ai?.id))
                                    await UserActions.updateUser({
                                      ...user_state,
                                      ais: [...(user_state?.ais || []), user_ai],
                                    })

                                  navigate("/c/settings")
                                }
                              }}
                            >
                              <RiAddCircleFill className="w-4 h-4 hover:text-zinc-200" />
                            </button>
                            <Link
                              to={`/c/ai/edit/${ai.id}`}
                              className="flex items-center tooltip tooltip-top"
                              data-tip="Modify AI"
                            >
                              <button>
                                <LuSettings2 className="w-4 h-4 hover:text-zinc-200" />
                              </button>
                            </Link>

                            <button
                              className="flex items-center tooltip tooltip-top"
                              data-tip="Hide AI"
                              onClick={async () => {
                                if (ai?.id && confirm("Are you sure you want to delete this AI?")) {
                                  if (ai?.id === "c1") {
                                    return error({
                                      message:
                                        "Assistant is required by Conductor's core functions, so it can't be deleted.",
                                    })
                                  }
                                  await AIActions.delete({ ai_id: ai?.id })
                                  if (user_state.ais?.find((a) => a.id === ai?.id))
                                    await UserActions.updateUser({
                                      ...user_state,
                                      ais: _.filter(user_state.ais, (a) => a.id !== ai?.id),
                                    })
                                  navigate("/c/settings")
                                }
                              }}
                            >
                              <BiBlock className="w-4 h-4 hover:text-zinc-200" />
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })
                .value()}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
