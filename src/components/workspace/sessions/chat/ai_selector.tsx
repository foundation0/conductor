import generate_llm_module_options from "@/libraries/generate_llm_module_options"
import generate_ai_options from "@/libraries/generate_ai_options"
import { UserT } from "@/data/loaders/user"
import Select from "react-select"
import { RiAddCircleFill, RiSettings3Fill } from "react-icons/ri"
import { Link } from "react-router-dom"
import _ from "lodash"
import { useEffect, useState } from "react"
import { useEvent } from "@/components/hooks/useEvent"
import { initLoaders } from "@/data/loaders"
import { TbSelector } from "react-icons/tb"
import { getAvatar } from "@/libraries/ai"
import useMemory from "@/components/hooks/useMemory"
import { mAISelectorT, mChatSessionT } from "@/data/schemas/memory"
import { handleModuleChange, handleAIChange } from "@/libraries/session_module"
import { AIsT } from "@/data/schemas/ai"
import { getMemoryState } from "@/libraries/memory"
import { ChatSessionT, SessionsT } from "@/data/schemas/sessions"

export function AISelector({
  // user_state,
  session_id,
  // installed_ais,
}: {
  // user_state: UserT
  session_id: string
  // installed_ais: any
}) {
  const user_state = useMemory<UserT>({
    id: "user",
  })
  const installed_ais = useMemory<AIsT>({
    id: "ais",
  })

  const sessions = useMemory<SessionsT>({
    id: `sessions`,
  })

  // if(!session) return null
  const mem = useMemory<mAISelectorT>({
    id: `${session_id}-ai-selector`,
    state: {
      show_settings: true,
      active_llm_module_text: "",
      ai_options: [],
      llm_options: [],
      session: sessions?.active[session_id] || {},
      context_len: 0,
    },
  })

  function update() {
    if (_.isEqualWith(mem.session, {})) return
    const mod = _.find(user_state.modules.installed, {
      id: mem.session.settings.module.id,
    })
    const variant = _.find(mod?.meta?.variants, {
      id: mem.session.settings.module.variant,
    })
    const active_llm_module_text = `${
      mod?.meta.name || mod?.meta.vendor.name
    } / ${variant?.name || variant?.id} ${
      variant?.context_len &&
      `(~${_.round(variant?.context_len * 0.8, 0)} word memory)`
    }`
    mem.active_llm_module_text = active_llm_module_text
    mem.context_len = variant?.context_len || 0

    mem.ai_options = generate_ai_options({
      user_state,
      ai_state: installed_ais,
      selected: `${mem.session.settings.ai}`,
      return_as_object: true,
    })

    mem.llm_options = generate_llm_module_options({
      user_state,
      selected: `${mem.session?.settings?.module?.id}/${mem.session?.settings?.module?.variant}`,
      return_as_object: true,
    })
  }

  useEffect(() => {
    update()
  }, [JSON.stringify(sessions?.active[session_id])])

  useEvent({
    name: "modules/update",
    action: update,
  })

  useEvent({
    name: "sessions.updateSessions.done",
    action: (session: any) => {
      const s = sessions?.active[session_id]
      if (!s) return
      mem.session = s
      update()
    },
  })

  async function setup() {
    // const { SessionState } = await initLoaders()
    // const sessions_state = await SessionState.get()
    // const session = sessions_state.active[session_id]
    // if (!session) return
    // mem.session = session
    update()
  }

  useEffect(() => {
    setup()
  }, [])

  // change session's active ai

  // change session's active module

  // if (_.isEqualWith(mem.session, {})) return
  return (
    <div
      id="popoverContent"
      className="z-10 inline-block absolute text-sm gradient-bg border-2 border-zinc-700 shadow-md rounded-lg md:w-[450px] w-[300px] max-w-[450px]"
    >
      <div className="px-3 py-2 rounded-t-lg">
        <h3 className="font-semibold text-center text-zinc-300">
          Choose your AI...
        </h3>
      </div>
      <div className="flex flex-col gap-2 px-3 py-2">
        <div className="flex flex-row flex-1 items-center">
          <div className="flex flex-1 text-sm font-semibold text-zinc-500">
            Available AIs
          </div>
          <div className="flex gap-2">
            <div
              className="text-xs font-medium tooltip tooltip-top cursor-pointer hidden"
              data-tip="Show settings"
            >
              <RiSettings3Fill
                className="w-4 h-4 text-zinc-500 hover:text-zinc-300 transition-all"
                onClick={() => (mem.show_settings = !mem.show_settings)}
              />
            </div>
            <Link
              className="text-xs font-medium tooltip tooltip-top"
              data-tip="Create new AI"
              to={`/c/ai/create`}
            >
              <RiAddCircleFill className="w-4 h-4 text-zinc-500 hover:text-zinc-300 transition-all" />
            </Link>
          </div>
        </div>
        <Select
          className="react-select-container"
          classNamePrefix="react-select"
          isOptionDisabled={(option) => option.disabled}
          onChange={(e: any) => {
            handleAIChange({
              value: e.value,
            })
          }}
          value={{
            label: `${
              _.find(installed_ais, { id: mem.session.settings.ai })?.persona
                .name ||
              _.first(_.get(installed_ais, "persona.name")) ||
              "click to select"
            }`,
            value: `${mem.session.settings.ai}`,
          }}
          placeholder="Choose AI..."
          options={mem.ai_options}
        ></Select>
        {mem.show_settings && (
          <div>
            <div className="text-sm font-semibold text-zinc-500">
              Reasoning engine in use
            </div>
            <Select
              className="react-select-container"
              classNamePrefix="react-select"
              isOptionDisabled={(option) => option.disabled === true}
              onChange={(e: any) => {
                handleModuleChange({
                  value: e.value,
                })
              }}
              value={{
                label: `${mem.active_llm_module_text}`,
                value: `${mem.session.settings?.module?.id}/${mem.session.settings?.module?.variant}`,
              }}
              placeholder="Choose LLM model..."
              options={mem.llm_options}
            ></Select>
          </div>
        )}
      </div>
    </div>
  )
}

export const AISelectorButton = function ({
  session_id,
}: {
  session_id: string
}) {
  const ai_state = useMemory<AIsT>({ id: "ais" })
  const [session, setSession] = useState<any>({})

  async function init() {
    const { SessionState } = await initLoaders()
    // const ai_state = await AIState.get()
    const sessions_state = await SessionState.get()
    const session = sessions_state.active[session_id]
    if (!session) return
    setSession(session)
  }
  useEffect(() => {
    init()
  }, [])

  useEvent({
    name: "sessions.updateSessions.done",
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
            src={
              _.find(ai_state, { id: session?.settings?.ai })?.meta?.avatar ||
              getAvatar({
                seed:
                  _.find(ai_state, { id: session?.settings?.ai })?.meta?.name ||
                  "",
              })
            }
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
