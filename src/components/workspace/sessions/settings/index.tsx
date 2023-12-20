import _ from "lodash"
// @ts-ignore
import { UserT } from "@/data/loaders/user"
import { useEvent } from "@/components/hooks/useEvent"
import { mAISelectorT, mChatSessionT } from "@/data/schemas/memory"
import useMemory from "@/components/hooks/useMemory"
import Select from "react-select"
import { AIsT } from "@/data/schemas/ai"
import { handleAIChange, handleModuleChange } from "@/libraries/session_module"
import { MdInfoOutline } from "react-icons/md"
import { emit, query } from "@/libraries/events"
import { useEffect } from "react"
import { error } from "@/libraries/logging"
import { ChatSessionT } from "@/data/schemas/sessions"

export default function Settings({ session_id }: { session_id: string }) {
  // const { user_state, ai_state } = useLoaderData() as {
  //   ai_state: AIsT
  //   user_state: UserT
  // }
  const user_state = useMemory<UserT>({ id: "user" })
  const ai_state = useMemory<AIsT>({ id: "ais" })

  const mem_session = useMemory<mChatSessionT>({
    id: `session-${session_id}`,
  })
  const mem_ai_selector = useMemory<mAISelectorT>({
    id: `${session_id}-ai-selector`,
  })

  async function onMemoryModeChange({ mode }: { mode: "full" | "similarity" }) {
    const memory = mem_session.session.settings?.memory || { rag_mode: mode }
    memory.rag_mode = mode
    mem_session.session.settings.memory = memory
    emit({
      type: "sessions.updateSession",
      data: {
        session_id: session_id,
        session: {
          settings: {
            memory,
          },
        },
      },
    })
  }

  async function applySettings({ session }: { session: ChatSessionT }) {
    // get model's default settings
    // const module_meta = await getModuleDetails({ model: mem_session.session.settings.module.variant })
    const model = user_state.modules.installed.find(
      (m) => m.id === session.settings.module.id,
    )
    if (!model) return error({ message: "Model not found" })
    const variant = model?.meta?.variants?.find(
      (v) => v.id === session.settings.module.variant,
    )
    if (!variant) return error({ message: "Model variant not found" })

    let settings = variant?.settings

    // apply session's settings
    _.merge(settings, session?.settings?.module?.settings || {})
    if (!settings) return error({ message: "Model settings not found" })
    settings.max_tokens =
      mem_ai_selector.context_len -
      mem_session.messages.tokens +
      mem_session.context.tokens
    mem_session.session.settings.module.settings = settings
    // _.set(mem_session, "session.settings.module.settings", settings)
  }

  async function updateSettings() {
    const session = (await query({
      type: "sessions.getById",
      data: { session_id },
    })) as ChatSessionT
    if (!session) return error({ message: "Session not found" })
    mem_session.session.settings.memory = session.settings.memory

    applySettings({ session })
  }

  useEvent({
    name: "sessions/tokensUpdate",
    target: session_id,
    action: applySettings,
  })

  useEvent({
    name: ["sessions/change", "sessions.updateSession.done"],
    // target: session_id,
    action: async function ({ session_id: sid }: { session_id: string }) {
      // console.log("notepad sessions/change", session_id)
      updateSettings()
    },
  })

  useEffect(() => {
    if (mem_session.session.id === session_id) updateSettings()
  }, [session_id])

  let available_memory =
    mem_ai_selector.context_len -
    (mem_session.messages.tokens + mem_session.context.tokens)
  if (
    available_memory < 0 &&
    mem_session.session.settings.memory?.rag_mode !== "full"
  )
    available_memory = 0

  return (
    <div className="Notepad flex flex-col px-3 pt-2 gap-6 w-full bg-zinc-800  overflow-auto overflow-x-hidden">
      <div className="flex flex-col text-zinc-300 text-sm font-semibold pb-1 gap-5">
        <div className="flex-grow">Session settings</div>
        <div className="flex flex-col flex-grow text-zinc-600 font-semibold gap-2">
          <div className="text-sm font-semibold text-zinc-300 border-b border-zinc-700">
            AI
          </div>
          <div>
            <div className="flex flex-1 text-xs text-zinc-500">
              Character / Persona{" "}
              <div
                className="tooltip tooltip-right"
                data-tip={`You can create your\nown with AI creator`}
              >
                <MdInfoOutline className="text-zinc-500 ml-0.5" />
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
                  _.find(ai_state, { id: mem_session.session?.settings?.ai })
                    ?.persona.name ||
                  _.first(_.get(ai_state, "persona.name")) ||
                  "click to select"
                }`,
                value: `${mem_session.session.settings.ai}`,
              }}
              placeholder="Choose AI..."
              options={mem_ai_selector.ai_options}
            ></Select>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Reasoning engine in use</div>
            <Select
              className="react-select-container text-xs"
              classNamePrefix="react-select"
              onChange={(e: any) => {
                handleModuleChange({
                  value: e.value,
                })
              }}
              value={{
                label: `${mem_ai_selector.active_llm_module_text}`,
                value: `${mem_session.session.settings.module.id}/${mem_session.session.settings.module.variant}`,
              }}
              placeholder="Choose LLM model..."
              options={mem_ai_selector.llm_options}
            ></Select>
          </div>
        </div>
        <div className="flex flex-col flex-grow text-zinc-600 font-semibold gap-3">
          <div className="text-sm font-semibold text-zinc-300 border-b border-zinc-700">
            Memory
          </div>
          <div className="flex flex-col gap-1 ">
            <div className="flex flex-1 text-xs text-zinc-500">
              Memory consumption
            </div>
            <div className="flex flex-row">
              <div className="flex flex-1 text-xs text-zinc-300 font-normal">
                Messages
                <div
                  className="tooltip tooltip-right"
                  data-tip={`All messages in the session,\nincluding model's template.`}
                >
                  <MdInfoOutline className="text-zinc-500 ml-0.5" />
                </div>
              </div>
              <div className="text-xs text-zinc-300 font-normal">
                {mem_session.messages.tokens} tokens
              </div>
            </div>
            <div className="flex flex-row">
              <div className="flex flex-1 text-xs text-zinc-300 font-normal">
                Attached data{" "}
                <div
                  className="tooltip tooltip-right"
                  data-tip={`All data currently attached\nto the session.`}
                >
                  <MdInfoOutline className="text-zinc-500 ml-0.5" />
                </div>
              </div>
              <div className="text-xs text-zinc-300 font-normal">
                {mem_session.context.tokens} tokens
              </div>
            </div>
            <div className="flex flex-row">
              <div className="flex flex-1 text-xs text-zinc-300 font-normal">
                Available memory
              </div>
              <div className="text-xs text-zinc-300 font-normal">
                {available_memory} tokens
              </div>
            </div>
            <div className="flex flex-row">
              <div className="flex flex-1 text-xs text-zinc-300 font-normal">
                Total memory
              </div>
              <div className="text-xs text-zinc-300 font-normal">
                {mem_ai_selector.context_len} tokens
              </div>
            </div>
            <div className="flex flex-row">
              <div className="flex flex-1 text-[10px] text-zinc-300 font-normal">
                Total memory in English words{" "}
                <div
                  className="tooltip tooltip-bottom"
                  data-tip={`Approximation based on how many\ntokens is one English word on average.\n\nEvery language is different.`}
                >
                  <MdInfoOutline className="text-zinc-500 ml-0.5" />
                </div>
              </div>
              <div className="text-[10px] text-zinc-300 font-normal">
                ~{_.round(mem_ai_selector.context_len * 0.8)} words
              </div>
            </div>
          </div>
          <div className="flex flex-col flex-grow text-zinc-600 font-semibold gap-2">
            <div className="form-control flex flex-1 text-xs text-zinc-500">
              Memory mode
            </div>
            <div className="flex flex-row">
              <div className="flex flex-1 text-xs text-zinc-300 font-normal">
                Full{" "}
                <div
                  className="tooltip tooltip-right"
                  data-tip={`Both messages and attached\ndata are in memory in full.\n\nUseful for summarization.`}
                >
                  <MdInfoOutline className="text-zinc-500 ml-0.5" />
                </div>
              </div>
              <div className="text-xs text-zinc-300 font-normal flex justify-end items-center">
                {" "}
                <div
                  className={`w-3 h-3 rounded-full cursor-pointer ${
                    mem_session.session.settings.memory?.rag_mode !== "full" ?
                      "bg-zinc-700 border border-zinc-500"
                    : "bg-blue-400"
                  }`}
                  onClick={() => onMemoryModeChange({ mode: "full" })}
                ></div>
                {/* <input
                  type="radio"
                  name="rag-mode"
                  className="radio w-3 h-3 checked:bg-blue-500"
                  // onClick={}
                  onChange={() => onMemoryModeChange({ mode: "full" })}
                  defaultChecked={
                    
                  }
                  checked={
                    mem_session.session.settings.memory?.rag_mode === "full"
                  }
                /> */}
              </div>
            </div>
            <div className="flex flex-row">
              <div className="flex flex-1 text-xs text-zinc-300 font-normal">
                Relevance matching{" "}
                <div
                  className="tooltip tooltip-right"
                  data-tip={`Messages are stored in full.\nThe rest of available\nmemory is filled with the\nmost relevant pieces of data\nbased on the recent messages.\n\nUseful for long conversations.`}
                >
                  <MdInfoOutline className="text-zinc-500 ml-0.5" />
                </div>
              </div>
              <div className="text-xs text-zinc-300 font-normal flex justify-end items-center">
                <div
                  className={` w-3 h-3 rounded-full cursor-pointer ${
                    (
                      mem_session.session.settings.memory?.rag_mode !==
                      "similarity"
                    ) ?
                      "bg-zinc-700 border border-zinc-500"
                    : "bg-blue-400"
                  }`}
                  onClick={() => onMemoryModeChange({ mode: "similarity" })}
                ></div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col flex-grow text-zinc-600 font-semibold gap-3">
          <div className="text-sm font-semibold text-zinc-300 border-b border-zinc-700">
            Settings
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex flex-1 text-xs text-zinc-300 font-normal pl-0.5">
              Creativity
              <div
                className="tooltip tooltip-right"
                data-tip={`Also known as "temperature".\nControls model's randomness.`}
              >
                <MdInfoOutline className="text-zinc-500 ml-0.5" />{" "}
              </div>
            </div>
            <div className="grid grid-cols-3 grid-flow-col">
              <div className="text-start text-[10px] text-zinc-300 font-normal">
                Serious
              </div>
              <div className="text-center text-[10px] text-zinc-300 font-normal">
                Moderate
              </div>
              <div className="text-end text-[10px] text-zinc-300 font-normal">
                Dali
              </div>
            </div>
            <div className="text-xs text-zinc-300 font-normal">
              <input
                type="range"
                min={0}
                max={1}
                defaultValue={
                  mem_session.session.settings?.module?.settings?.temperature
                }
                value={
                  mem_session.session.settings?.module?.settings?.temperature
                }
                step={0.05}
                onChange={(e) => {
                  const settings =
                    mem_session.session.settings.module?.settings || {}
                  settings.temperature = Number(e.target.value)
                  // mem_session.session.settings?.module?.settings?.temperature = Number(e.target.value)
                  emit({
                    type: "sessions.updateSession",
                    data: {
                      session_id: session_id,
                      session: {
                        settings: {
                          module: {
                            settings,
                          },
                        },
                      },
                    },
                  })
                }}
                className="range range-xs"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex flex-1 text-xs text-zinc-300 font-normal pl-0.5">
              Novelty
              <div
                className="tooltip tooltip-right"
                data-tip={`Also known as top-k.\nControls how many tokens\nare considered when\nmodel is generating text.\n\nHigher value means more\nrandom text.`}
              >
                <MdInfoOutline className="text-zinc-500 ml-0.5" />
              </div>
            </div>
            <div className="grid grid-cols-3 grid-flow-col">
              <div className=" text-start text-[10px] text-zinc-300 font-normal">
                Predictable
              </div>
              <div className=" text-center text-[10px] text-zinc-300 font-normal">
                Moderate
              </div>
              <div className=" text-end text-[10px] text-zinc-300 font-normal">
                Random
              </div>
            </div>
            <div className="text-xs text-zinc-300 font-normal">
              <input
                type="range"
                min={1}
                max={15}
                value={Number(
                  mem_session.session.settings?.module?.settings?.top_k || 1,
                )}
                step={1}
                onChange={(e) => {
                  // mem_session.session.settings?.module?.settings?.top_k = Number(e.target.value)
                  const settings =
                    mem_session.session?.settings?.module?.settings || {}
                  settings.top_k = Number(e.target.value)
                  emit({
                    type: "sessions.updateSession",
                    data: {
                      session_id: session_id,
                      session: {
                        settings: {
                          module: {
                            settings,
                          },
                        },
                      },
                    },
                  })
                }}
                className="range range-xs"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex flex-1 text-xs text-zinc-300 font-normal pl-0.5">
              Diversity
              <div
                className="tooltip tooltip-right"
                data-tip={`Also known as top-p.\nControls how many of the most\nlikely tokens are considered for\neach output.\n\nHigher value means more\nrandom text.`}
              >
                <MdInfoOutline className="text-zinc-500 ml-0.5" />
              </div>
            </div>
            <div className="grid grid-cols-3 grid-flow-col">
              <div className="text-start text-[10px] text-zinc-300 font-normal">
                Rigid
              </div>
              <div className="text-center text-[10px] text-zinc-300 font-normal">
                Moderate
              </div>
              <div className="text-end text-[10px] text-zinc-300 font-normal">
                Random
              </div>
            </div>
            <div className="text-xs text-zinc-300 font-normal">
              <input
                type="range"
                min={0.1}
                max={1}
                value={
                  1 -
                    (Number(
                      mem_session.session.settings?.module?.settings?.top_p,
                    ) || 0.8) || 0
                }
                step={0.05}
                onChange={(e) => {
                  // mem_session.session.settings?.module?.settings?.top_p = 1 - Number(e.target.value)
                  const settings =
                    mem_session.session?.settings?.module?.settings || {}
                  settings.top_p = 1 - Number(e.target.value)
                  emit({
                    type: "sessions.updateSession",
                    data: {
                      session_id: session_id,
                      session: {
                        settings: {
                          module: {
                            settings,
                          },
                        },
                      },
                    },
                  })
                }}
                className="range range-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
