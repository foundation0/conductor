import generate_llm_module_options from "@/libraries/generate_llm_module_options"
import generate_ai_options from "@/libraries/generate_ai_options"
import { UserT } from "@/data/loaders/user"
import Select from "react-select"
import { MdSettingsSuggest } from "react-icons/md"
import { RiAddCircleFill, RiSettings3Fill } from "react-icons/ri"
import { Link, useParams } from "react-router-dom"
import _, { set } from "lodash"
import { useEffect, useState } from "react"
import { useEvent } from "@/components/hooks/useEvent"
import { error } from "@/libraries/logging"
import { initLoaders } from "@/data/loaders"
import SessionsActions from "@/data/actions/sessions"
import { TbSelector } from "react-icons/tb"
import { getAvatar } from "@/libraries/ai"

export function AISelector({
  user_state,
  session_id,
  installed_ais,
}: {
  user_state: UserT
  session_id: string
  installed_ais: any
}) {
  const [show_settings, setShowSettings] = useState(true)
  const [active_llm_module_text, setActiveLLMModuleText] = useState("")
  const [session, setSession] = useState<any>({})
  const [ai_options, setAIOptions] = useState<any>([])
  const [llm_options, setLLMOptions] = useState<any>([])

  function update() {
    if (_.isEqualWith(session, {})) return
    const mod = _.find(user_state.modules.installed, { id: session.settings.module.id })
    const variant = _.find(mod?.meta?.variants, { id: session.settings.module.variant })
    const active_llm_module_text = `${mod?.meta.name || mod?.meta.vendor.name} / ${variant?.name || variant?.id} ${
      variant?.context_len && `(~${_.round(variant?.context_len / 5, 0)} word memory)`
    }`
    setActiveLLMModuleText(active_llm_module_text)

    setAIOptions(
      generate_ai_options({
        user_state,
        ai_state: installed_ais,
        selected: `${session.settings.ai}`,
        return_as_object: true,
      })
    )

    setLLMOptions(
      generate_llm_module_options({
        user_state,
        selected: `${session.settings.module.id}/${session.settings.module.variant}`,
        return_as_object: true,
      })
    )
  }

  useEffect(() => {
    update()
  }, [JSON.stringify(session)])

  useEvent({
    name: "sessions.updateSessions.done",
    // target: session_id,
    action: (session: any) => {
      const s = session?.active[session_id]
      if (!s) return
      setSession(s)
    },
  })

  async function setup() {
    const { SessionState } = await initLoaders()
    const sessions_state = await SessionState.get()
    const session = sessions_state.active[session_id]
    if (!session) return
    setSession(session)
    update()
  }

  useEffect(() => {
    setup()
  }, [])

  // change session's active ai
  const handleAIChange = async ({ value }: { value: string }) => {
    const { SessionState, AIState } = await initLoaders()
    const ai_state = await AIState.get()
    const sessions_state = await SessionState.get()
    const session = sessions_state.active[session_id]
    if (!session) return

    // check that ai is installed
    const ai = _.find(ai_state, { id: value })
    if (!ai) return error({ message: "AI not found" })

    // update session default ai
    const new_session = _.cloneDeep(session)
    new_session.settings.ai = ai.id

    // update session llm if not locked
    if (!session.settings.module.locked) {
      new_session.settings.module = { id: ai.default_llm_module.id, variant: ai.default_llm_module.variant_id || "" }
    }

    // update session in sessions
    const new_sessions = _.cloneDeep(sessions_state)
    new_sessions.active[session.id] = new_session
    await SessionsActions.updateSessions(new_sessions)

    // navigate(`/c/${workspace_id}/${session.id}`)
    // set focus to #input
    //setTimeout(() => {
    //  fieldFocus({ selector: "#input" })
    // }, 200)
  }

  // change session's active module
  const handleModuleChange = async ({ value }: { value: string }) => {
    const { SessionState, AIState } = await initLoaders()
    const sessions_state = await SessionState.get()
    const session = sessions_state.active[session_id]
    if (!session) return

    const new_llm_module = value.split("/")
    if (!new_llm_module) return error({ message: "Module not found" })
    // update session default module
    const new_session = _.cloneDeep(session)
    new_session.settings.module = { id: new_llm_module[0], variant: new_llm_module[1] }

    // update session in sessions
    const new_sessions = _.cloneDeep(sessions_state)
    new_sessions.active[session.id] = new_session
    await SessionsActions.updateSessions(new_sessions)

    // navigate(`/c/${workspace_id}/${session.id}`)

    // set focus to #input
    // setTimeout(() => {
    //   fieldFocus({ selector: "#input" })
    // }, 200)
  }
  if (_.isEqualWith(session, {})) return
  return (
    <div
      id="popoverContent"
      className="z-10 inline-block absolute text-sm gradient-bg border-2 border-zinc-700 shadow-md rounded-lg md:w-[450px] w-[300px] max-w-[450px]"
    >
      <div className="px-3 py-2 rounded-t-lg">
        <h3 className="font-semibold text-center">Choose your AI...</h3>
      </div>
      <div className="flex flex-col gap-2 px-3 py-2">
        <div className="flex flex-row flex-1 items-center">
          <div className="flex flex-1 text-sm font-semibold text-zinc-500">Available AIs</div>
          <div className="flex gap-2">
            <div className="text-xs font-medium tooltip tooltip-top cursor-pointer hidden" data-tip="Show settings">
              <RiSettings3Fill
                className="w-4 h-4 text-zinc-500 hover:text-zinc-300 transition-all"
                onClick={() => setShowSettings(!show_settings)}
              />
            </div>
            <Link className="text-xs font-medium tooltip tooltip-top" data-tip="Create new AI" to={`/c/ai/create`}>
              <RiAddCircleFill className="w-4 h-4 text-zinc-500 hover:text-zinc-300 transition-all" />
            </Link>
          </div>
        </div>
        <Select
          className="react-select-container"
          classNamePrefix="react-select"
          onChange={(e: any) => {
            handleAIChange({
              value: e.value,
            })
          }}
          value={{
            label: `${
              _.find(installed_ais, { id: session.settings.ai })?.persona.name ||
              _.first(_.get(installed_ais, "persona.name")) ||
              "click to select"
            }`,
            value: `${session.settings.ai}`,
          }}
          placeholder="Choose AI..."
          options={ai_options}
        ></Select>
        {show_settings && (
          <div>
            <div className="text-sm font-semibold text-zinc-500">Reasoning engine in use</div>
            <Select
              className="react-select-container"
              classNamePrefix="react-select"
              onChange={(e: any) => {
                handleModuleChange({
                  value: e.value,
                })
              }}
              value={{
                label: `${active_llm_module_text}`,
                value: `${session.settings.module.id}/${session.settings.module.variant}`,
              }}
              placeholder="Choose LLM model..."
              options={llm_options}
            ></Select>
          </div>
        )}
      </div>
    </div>
  )
}

export const AISelectorButton = function ({ session_id }: { session_id: string }) {
  const [ai_state, setAIState] = useState<any>([])
  const [session, setSession] = useState<any>({})

  async function init() {
    const { SessionState, AIState } = await initLoaders()
    const ai_state = await AIState.get()
    const sessions_state = await SessionState.get()
    const session = sessions_state.active[session_id]
    if (!session) return
    setSession(session)
    setAIState(ai_state)
  }
  useEffect(() => {
    init()
  }, [])

  useEvent({
    name: "sessions.updateSessions.done",
    // target: session_id,
    action: () => {
      init()
    },
  })

  return (
    <label
      tabIndex={0}
      className="flex px-3 py-2 text-white font-semibold border-2 border-zinc-900/80 bg-zinc-800 hover:bg-zinc-700/30 transition-all rounded-xl cursor-pointer w-[300px]"
    >
      <div className="flex flex-row flex-grow flex-1 gap-2">
        <div className="flex flex-col  items-center justify-center">
          <img
            src={getAvatar({ seed: _.find(ai_state, { id: session?.settings?.ai })?.meta?.name || "" })}
            className={`border-0 rounded-full w-8 aspect-square `}
          />
        </div>
        <div className="flex flex-row flex-grow flex-1 items-center text-zinc-500 hover:text-zinc-200 transition-all">
          <div className="flex flex-col flex-1 text-zinc-200">
            {_.find(ai_state, { id: session?.settings?.ai })?.persona.name}
          </div>
          <div className="flex flex-col">
            <TbSelector className="" />
          </div>
        </div>
      </div>
    </label>
  )
}
