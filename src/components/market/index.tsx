import { error } from "@/libraries/logging"
import { MdOutlineRemoveCircle, MdSettingsSuggest } from "react-icons/md"
import { Link, useLoaderData, useNavigate } from "react-router-dom"
import UserActions from "@/data/actions/user"
import _ from "lodash"
// @ts-ignore
import IntersectIcon from "@/assets/icons/intersect.svg"
import { UserT } from "@/data/loaders/user"
import { AIsT } from "@/data/schemas/ai"
// import { getBridgeAPI } from "@/libraries/bridge"
import { DownloadFromHF } from "./download_hf"
import { useState } from "react"
// import ModelIcon from "@/assets/icons/model.svg"
import { parseNumber } from "@/libraries/utilities"
import UsersActions from "@/data/actions/users"
import AIActions from "@/data/actions/ai"
import { ModuleSettings } from "./module_settings"
import { BiBlock } from "react-icons/bi"
import { LuSettings2 } from "react-icons/lu"
import { RiAddCircleFill } from "react-icons/ri"
import { getAvatar } from "@/libraries/ai"
import PersonaIcon from "@/assets/icons/persona.svg"
import useMemory from "../hooks/useMemory"

type ModelDownloadT = {
  req_id: string
  url: string
  filename: string
  progress: number
  speed: number
  status: "connecting" | "downloading" | "cancelled" | "done"
  error?: string
}

export default function Market() {
  /* const { user_state } = useLoaderData() as {
    user_state: UserT
    //ai_state: AIsT
  } */
  const ai_state = useMemory<AIsT>({ id: 'ais' })
  const user_state = useMemory<UserT>({ id: 'user' })
  const [model_downloads, setModelDownloads] = useState<ModelDownloadT[]>([])
  const [installed_models, setInstalledModels] = useState<any[]>([])
  const navigate = useNavigate()

  function changeModelDownloadStatus({
    req_id,
    status,
  }: {
    req_id: string
    status: ModelDownloadT["status"]
  }) {
    setModelDownloads((prevDownloads) => {
      const updatedDownloads = prevDownloads.map((download) => {
        if (download.req_id === req_id && download.status !== "done") {
          return {
            ...download,
            status,
          }
        }
        return download
      })
      return updatedDownloads
    })
  }

  async function updateInstalledModels() {
    /* const bridge = getBridgeAPI()
    if (!bridge) return
    const installed_models = await bridge.getInstalledModels()
    setInstalledModels(installed_models || []) */
  }

  function getBridgeAPI() {
    return true
  }

  // onload
/*   useEffect(() => {
    updateInstalledModels()

    const events = [
      "modelDownloadProgress",
      "modelDownloadDone",
      "modelDownloadStarted",
      "modelDownloadCancel",
      "modelDownloadCancelled",
    ]
    events.forEach((event) => {
      eventEmitter.on(event, (arg: any) => {
        console.log("got event", event, arg)
        switch (event) {
          case "modelDownloadProgress":
            setModelDownloads((prevDownloads) => {
              const updatedDownloads = prevDownloads.map((download) => {
                if (download.req_id === arg.req_id) {
                  return {
                    ...download,
                    progress: arg.progress,
                    speed: arg.speed,
                    status: "downloading" as const,
                  }
                }
                return download
              })
              return updatedDownloads
            })
            break
          case "modelDownloadDone":
            // copy download model object to installed models
            function markModelDownloadDone() {
              const model = _.find(model_downloads, { req_id: arg.req_id })
              if (model) {
                updateInstalledModels()
                setModelDownloads(
                  _.remove(model_downloads, { req_id: arg.req_id }),
                )
              } else setTimeout(markModelDownloadDone, 1000)
            }
            markModelDownloadDone()
            navigate("/conductor/modules/")
            break
          case "modelDownloadStarted":
            // change model download status to downloading
            changeModelDownloadStatus({
              req_id: arg.req_id,
              status: "downloading",
            })
            break

          case "modelDownloadCancelled":
            // handle model download cancelled event
            //changeModelDownloadStatus({ req_id: arg.req_id, status: "cancelled" })
            setModelDownloads(_.remove(model_downloads, { req_id: arg.req_id }))
            break
          default:
            // noop
            break
        }
      })
    })
  }, []) */

  const downloadModel = async ({ url }: { url: string }) => {
    const bridge = getBridgeAPI()
    if (!bridge) return error({ message: "Bridge not found" })
    if (url) {
      /* const dl_id = await bridge.downloadModel({ url })
      if (dl_id) {
        if ("error" in dl_id) return alert(dl_id.error)
        setModelDownloads([
          ...model_downloads,
          {
            req_id: dl_id.req_id,
            url,
            filename: dl_id.filename,
            progress: 0,
            speed: 0,
            status: "connecting",
          } as ModelDownloadT,
        ])
        ;(window as any)["download-hf-modal"].close()
      } else {
        alert("Failed to download model. Are you sure the URL is correct?")
      } */
    } else error({ message: "Please enter a valid HuggingFace model URL" })
  }

  const [field_edit_id, setFieldEditId] = useState("")

  const handleEdit = async ({
    value,
    name,
    module_id,
  }: {
    value: string
    name: string
    module_id?: string
  }) => {
    // field name is concatenated with . to denote nested fields
    let field_name = name.split(".")
    let field_value = parseNumber(value)
    if (module_id) {
      const index = _.findIndex(user_state.modules.installed, { id: module_id })
      field_name = [`modules`, `installed`, index.toString(), ...field_name]
    }
    if (typeof field_value === "string")
      field_value = field_value.replace(/\\n/g, "\n")
    const new_user_state = {
      ...user_state,
      ..._.set(_.cloneDeep(user_state), field_name, field_value),
    }
    await UserActions.updateUser(new_user_state)

    // pass profile updates to local users list
    if (
      field_name[0] === "meta" &&
      ["name", "profile_photos"].indexOf(field_name[1]) !== -1
    ) {
      const public_user = await UsersActions.getUser({ id: user_state.id })
      const f_name = field_name.slice(1).join(".")
      const updated_public_user = _.set(public_user, f_name, field_value)
      await UsersActions.updateUser(updated_public_user)
    }
    // navigate("/c/modules")
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

  return (
    <div className="Settings content overflow-x-hidden px-4 flex flex-col flex-grow items-center m-10">
      <div className="flex flex-col w-full justify-start items-start">
        <div className="text-2xl text-zinc-400 shadow font-semibold">
          Modules
        </div>
        <hr className="w-full border-zinc-700 my-4" />
        <div className="flex flex-row w-full gap-6">
          <div className="flex md:w-1/2 flex-col">
            <div className="text-zinc-400 shadow font-semibold text-lg mt-10 mb-3 w-full border-b border-b-zinc-700">
              Engines
            </div>
            <div className="flex flex-col w-full gap-2">
              <div className="flex flex-row w-full gap-2">
                <div
                  className="flex flex-1 bg-zinc-900 rounded-lg p-3 flex flex-col justify-center items-center cursor-not-allowed border-zinc-700 border border-dashed text-zinc-600 hover:bg-zinc-850 hover:text-zinc-500 hover:border-zinc-500 tooltip tooltip-top"
                  data-tip="Coming soon"
                >
                  {/* <HiPlus className="w-8 h-8 rounded-full border border-dashed border-zinc-600 m-2 p-1" /> */}
                  <img
                    src={IntersectIcon}
                    className="w-10 h-10 rounded-full border-2 border-dashed border-zinc-700 m-2 p-1 saturate-0 hover:saturate-50"
                  />
                  <div className="text-xs font-semibold">
                    Install custom model
                  </div>
                </div>
                <div
                  className="flex flex-1 bg-zinc-900 rounded-lg p-3 flex flex-col justify-center items-center cursor-not-allowed border-zinc-700 border border-dashed text-zinc-600 hover:bg-zinc-850 hover:text-zinc-500 hover:border-zinc-500 tooltip tooltip-top"
                  data-tip="Coming soon"
                >
                  {/* <HiPlus className="w-8 h-8 rounded-full border border-dashed border-zinc-600 m-2 p-1" /> */}
                  <img
                    src={IntersectIcon}
                    className="w-10 h-10 rounded-full border-2 border-dashed border-zinc-700 m-2 p-1 saturate-0 hover:saturate-50"
                  />
                  <div className="text-xs font-semibold">
                    Browser model marketplace
                  </div>
                </div>
              </div>
              {user_state?.modules.installed
                ?.filter((m) => m.meta?.type !== "utility")
                .map((module: any, index: number) => {
                  return (
                    <div
                      key={module.id}
                      className=" bg-zinc-800/50 bg-gradient rounded-xl p-5 border-t border-t-zinc-600/50"
                    >
                      <div className="flex w-full mb-2 pb-2 border-b border-b-zinc-700">
                        <div className="flex items-center text-zinc-400 font-semibold">
                          {module.meta.vendor.name} / {module.meta.name}
                        </div>
                        <div className="flex flex-1 items-center justify-end">
                          <MdSettingsSuggest
                            className="w-4 h-4 text-zinc-400 hover:text-zinc-300 cursor-pointer"
                            onClick={() => {
                              // @ts-ignore
                              window[`settings-${module.id}`]?.showModal()
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center text-zinc-400 font-semibold text-xs mb-3">
                        {module.meta.description || "No description"}
                      </div>
                      <ModuleSettings
                        {...{
                          module,
                          index: index - 1,
                          setFieldEditId,
                          handleEdit,
                          EditComponent,
                        }}
                      />
                    </div>
                  )
                })}
            </div>
          </div>
          <div className="flex md:w-1/2 flex-col hidden">
            <div className=" text-zinc-400 shadow font-semibold text-lg mt-10 mb-3 w-full border-b border-b-zinc-700">
              Local models
            </div>
            <div className="flex flex-grow flex-1 w-full flex-col gap-3">
              <div className="flex flex-row w-full gap-2">
                {/* <Link
                  to="/conductor/modules/models/download"
                  className="w-1/2 bg-zinc-900 rounded-lg p-3 flex flex-col justify-center items-center border-zinc-700 border text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200 hover:border-zinc-500 tooltip tooltip-top transition-all"
                  data-tip="Download a model from HuggingFace"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    ;(window as any)["download-hf-modal"].showModal()
                  }}
                >
                  <img
                    src={HFIcon}
                    className="w-10 h-10 rounded-full m-2 p-1 "
                  />
                  <div className="text-xs font-semibold">Download model from HuggingFace</div>
                </Link> */}
                <div
                  className="w-full bg-zinc-900 rounded-lg p-3 flex flex-col justify-center items-center cursor-not-allowed border-zinc-700 border border-dashed text-zinc-600 hover:bg-zinc-850 hover:text-zinc-500 hover:border-zinc-500 tooltip tooltip-top  transition-all"
                  data-tip="Coming soon"
                >
                  <img
                    src={IntersectIcon}
                    className="w-10 h-10 rounded-full border-2 border-dashed border-zinc-700 m-2 p-1 saturate-0 hover:saturate-50"
                  />
                  <div className="text-xs font-semibold">
                    Browse model marketplace
                  </div>
                </div>
              </div>
              {(_.size(installed_models) > 0 ||
                _.size(model_downloads) > 0) && (
                <div className="flex flex-col w-full gap-2 bg-zinc-800/50 bg-gradient rounded-xl p-5 border-t border-t-zinc-600/50">
                  <div className="flex text-md font-semibold text-zinc-300">
                    Installed models
                  </div>
                  {getBridgeAPI() ?
                    <div>
                      <ul className="w-full divide-y divide-gray-700">
                        {_(model_downloads)
                          .filter((model) => model.status !== "done")
                          .compact()
                          .orderBy("req_id")
                          .map((model: any, index: number) => {
                            return (
                              <li
                                className="py-3"
                                key={`model-download-${model.req_id}`}
                              >
                                <div className="flex items-center space-x-4">
                                  <div className="flex-shrink-0">
                                    {/* <img className="w-8 h-8" src={ModelIcon} /> */}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate text-zinc-200">
                                      {model.url}
                                    </p>
                                    <div className="flex flex-col flex-1">
                                      <progress
                                        className="progress progress-warning bg-zinc-700"
                                        value={model.progress * 100}
                                        max="100"
                                      ></progress>
                                      <div>
                                        {model.status}{" "}
                                        {model.status === "downloading" &&
                                          _.round(model.speed / 1024, 1) +
                                            " Mb/s"}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="inline-flex items-center text-base font-semibold text-zinc-400">
                                    <div className="inline-flex items-center gap-3">
                                      <button
                                        className="flex items-center tooltip tooltip-top"
                                        data-tip="Cancel download"
                                        onClick={async () => {
                                          // getBridgeAPI()?.cancelModelDownload({ req_id: model.req_id })
                                        }}
                                      >
                                        <MdOutlineRemoveCircle className="w-4 h-4 hover:text-zinc-200" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            )
                          })
                          .value()}
                        {_(installed_models)
                          .compact()
                          .orderBy("filename")
                          .map((model: any, index: number) => {
                            return (
                              <li
                                className="py-3"
                                key={`model-install-${model.filename}`}
                              >
                                <div className="flex items-center space-x-4">
                                  <div className="flex-shrink-0">
                                    {/* <img className="w-8 h-8" src={ModelIcon} /> */}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate text-zinc-200">
                                      {model.name}
                                    </p>
                                  </div>
                                  <div className="inline-flex items-center text-base font-semibold text-zinc-400">
                                    <div className="inline-flex items-center gap-3">
                                      <button
                                        className="flex items-center tooltip tooltip-top"
                                        data-tip="Uninstall model"
                                        onClick={async () => {
                                          if (
                                            confirm(
                                              `Are you sure you want to delete ${model.name}?`,
                                            )
                                          ) {
                                            /* const ok = await (getBridgeAPI())?.deleteModel({ name: model.name })
                                            if(ok?.error) return error({ message: ok.error })
                                            await updateInstalledModels()
                                            navigate("/conductor/modules/") */
                                          }
                                        }}
                                      >
                                        <MdOutlineRemoveCircle className="w-4 h-4 hover:text-zinc-200" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            )
                          })
                          .value()}
                      </ul>
                      {/* <ul className="w-full divide-y divide-gray-700">
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
                                <p className="text-xs text-gray-500 truncate dark:text-gray-400">
                                  {ai?.meta.description}
                                </p>
                              </div>
                              <div className="inline-flex items-center text-base font-semibold text-zinc-400">
                                {ai?.id !== "c1" && (
                                  <div className="inline-flex items-center gap-3">
                                    <Link
                                      to={`/conductor/ai/edit/${ai.id}`}
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
                                          navigate("/conductor/settings")
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
                  </ul> */}
                    </div>
                  : <div className="text-xs text-yellow-400 font-semibold p-4 border border-dashed border-zinc-700 bg-zinc-700/20 rounded-xl">
                      <p className="mb-4">
                        Model download is not yet available in the browser.
                      </p>
                      <p>
                        Download Prompt app (macOS / Windows / Linux) to unlock
                        model downloads and hardware accelerated performance.
                      </p>
                    </div>
                  }
                </div>
              )}
            </div>
          </div>
          <div className="flex md:w-1/2 flex-col">
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
                  <div className="text-xs font-semibold">
                    Browse AI marketplace
                  </div>
                </div>
              </div>
              <div className="flex flex-col w-full gap-2 bg-zinc-800/50 bg-gradient rounded-xl p-5 border-t border-t-zinc-600/50">
                <div className="flex text-md font-semibold text-zinc-300">
                  Enabled AIs
                </div>
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
                              <img
                                className="w-8 h-8 rounded-full"
                                src={ai?.meta?.avatar || getAvatar({ seed: ai?.meta?.name || "" })}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-zinc-200">
                                {ai?.meta.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate dark:text-gray-400">
                                {ai?.meta.description}
                              </p>
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
                                      if (
                                        ai?.id &&
                                        confirm(
                                          "Are you sure you want to uninstall this AI?",
                                        )
                                      ) {
                                        await UserActions.updateUser({
                                          ...user_state,
                                          ais: _.filter(
                                            user_state.ais,
                                            (a) => a.id !== ai?.id,
                                          ),
                                        })
                                        // navigate("/c/modules")
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
                <div className="flex text-md font-semibold text-zinc-300">
                  Available AIs
                </div>
                <ul className="w-full divide-y divide-gray-700">
                  {_(ai_state)
                    .orderBy("meta.name")
                    .map((ai: any, index: number) => {
                      if (!ai) return null
                      return (
                        <li className="py-3" key={`ai-store-${ai.id}`}>
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <img
                                className="w-8 h-8 rounded-full"
                                src={ai?.meta?.avatar || getAvatar({ seed: ai?.meta?.name || "" })}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-zinc-200">
                                {ai?.meta.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate dark:text-gray-400">
                                {ai?.meta.description}
                              </p>
                            </div>
                            {ai.id !== "c1" && (
                              <div className="inline-flex gap-3 items-center justify-center text-base font-semibold text-zinc-400">
                                <button
                                  className="flex items-center tooltip tooltip-top"
                                  data-tip="Install AI"
                                  onClick={async () => {
                                    if (ai?.id) {
                                      const user_ai: {
                                        id: string
                                        status: "active" | "inactive"
                                      } = {
                                        id: ai?.id,
                                        status: "active",
                                      }
                                      // add AI to user_state.ais if it's not already there
                                      if (
                                        !user_state.ais?.find(
                                          (a) => a.id === ai?.id,
                                        )
                                      )
                                        await UserActions.updateUser({
                                          ...user_state,
                                          ais: [
                                            ...(user_state?.ais || []),
                                            user_ai,
                                          ],
                                        })

                                      // navigate("/c/modules")
                                    }
                                  }}
                                >
                                  <RiAddCircleFill className="w-4 h-4 hover:text-zinc-200" />
                                </button>
                               {/*  <Link
                                  to={`/c/ai/edit/${ai.id}`}
                                  className="flex items-center tooltip tooltip-top"
                                  data-tip="Modify AI"
                                >
                                  <button>
                                    <LuSettings2 className="w-4 h-4 hover:text-zinc-200" />
                                  </button>
                                </Link> */}

                                <button
                                  className="flex items-center tooltip tooltip-top"
                                  data-tip="Hide AI"
                                  onClick={async () => {
                                    if (
                                      ai?.id &&
                                      confirm(
                                        "Are you sure you want to hide this AI?",
                                      )
                                    ) {
                                      if (ai?.id === "c1") {
                                        return error({
                                          message:
                                            "Assistant is required by Conductor's core functions, so it can't be deleted.",
                                        })
                                      }
                                      await AIActions.delete({ ai_id: ai?.id })
                                      if (
                                        user_state.ais?.find(
                                          (a) => a.id === ai?.id,
                                        )
                                      )
                                        await UserActions.updateUser({
                                          ...user_state,
                                          ais: _.filter(
                                            user_state.ais,
                                            (a) => a.id !== ai?.id,
                                          ),
                                        })
                                      // navigate("/c/modules")
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
      </div>
      <DownloadFromHF downloadModel={downloadModel} />
    </div>
  )
}
