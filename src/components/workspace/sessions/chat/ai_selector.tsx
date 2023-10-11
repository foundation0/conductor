import generate_llm_module_options from "@/libraries/generate_llm_module_options"
import generate_ai_options from "@/libraries/generate_ai_options"
import { UserT } from "@/data/loaders/user"
import Select from "react-select"
import { MdSettingsSuggest } from "react-icons/md"
import { RiAddCircleFill, RiSettings3Fill } from "react-icons/ri"
import { Link } from "react-router-dom"
import _ from "lodash"
import { useState } from "react"

export function AISelector({
  user_state,
  session,
  installed_ais,
  handleModuleChange,
  handleAIChange,
}: {
  user_state: UserT
  session: any
  installed_ais: any
  handleModuleChange: Function
  handleAIChange: Function
}) {
  const [show_settings, setShowSettings] = useState(true)

  const mod = _.find(user_state.modules.installed, { id: session.settings.module.id })
  const variant = _.find(mod?.meta?.variants, { id: session.settings.module.variant })
  const active_llm_module_text = `${mod?.meta.name || mod?.meta.vendor.name} / ${variant?.name || variant?.id} ${
    variant?.context_len && `(~${_.round(variant?.context_len / 5, 0)} word memory)`
  }`
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
            <div className="text-xs font-medium tooltip tooltip-top cursor-pointer hidden"
              data-tip="Show settings">
              <RiSettings3Fill className="w-4 h-4 text-zinc-500 hover:text-zinc-300 transition-all" onClick={() => setShowSettings(!show_settings)} />
            </div>
            <Link
              className="text-xs font-medium tooltip tooltip-top"
              data-tip="Create new AI"
              to={`/conductor/ai/create`}
            >
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
          options={generate_ai_options({
            user_state,
            ai_state: installed_ais,
            selected: `${session.settings.ai}`,
            return_as_object: true,
          })}
        ></Select>
        {show_settings && <div>
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
            options={generate_llm_module_options({
              user_state,
              selected: `${session.settings.module.id}/${session.settings.module.variant}`,
              return_as_object: true,
            })}
          ></Select>
        </div>}
      </div>
    </div>
  )
}
