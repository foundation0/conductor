import { useEffect, useState, useRef } from "react"
import _ from "lodash"
import { MessageRowT, SessionsT } from "@/data/schemas/sessions"
import { Switch, Match } from "react-solid-flow"
import { RichTextarea } from "rich-textarea"
import RewindIcon from "@/assets/icons/rewind.svg"
import MessageIcon from "@/assets/icons/send.svg"
import PieIcon from "@/assets/icons/pie.svg"
import { emit } from "@/libraries/events"
import useMemory from "@/components/hooks/useMemory"
import { mChatSessionT } from "@/data/schemas/memory"
import { getModuleDetails } from "@/libraries/ai"
import { error } from "@/libraries/logging"
import { useEvent } from "@/components/hooks/useEvent"
import { RiRobot2Fill } from "react-icons/ri"

let PROMPT_CACHE: { [key: string]: string } = {}

export default function Input({
  session_id,
  messages,
  send,
  gen_in_progress,
  is_new_branch,
  // genController,
  disabled,
  input_text,
  // setMsgUpdateTs,
  session,
}: {
  session_id: string
  messages: MessageRowT[] | undefined
  send: Function
  gen_in_progress: boolean
  is_new_branch: boolean | string
  // genController: any
  disabled?: boolean
  input_text?: string
  // setMsgUpdateTs: Function
  session: SessionsT["active"][0]
}) {
  const mem_session = useMemory<mChatSessionT>({ id: `session-${session_id}` })
  const mem = useMemory<{
    ctx_sum: number
    ctx_used: number
    module_name: string
    memory_indicator: "red" | "yellow" | "green"
  }>({
    id: `session-${session_id}-input`,
    state: {
      ctx_sum: 0,
      ctx_used: 0,
      module_name: "",
      memory_indicator: "green",
    },
  })
  const [message, setMessage] = useState<string>("")
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const { ctx_sum, ctx_used, memory_indicator, module_name } = mem

  // compute memory indicator status
  async function computeUsedMemory() {
    const sum = mem_session.context.tokens + mem_session.messages.tokens
    mem.ctx_sum = sum
    const model = mem_session.session.settings?.module?.variant
    if (!model) return
    getModuleDetails({
      model,
    }).then((_m) => {
      if (!_m) return error({ message: "Failed to get module details" })
      mem.module_name = _m.module.name || ""
      const ctx_len = _m.module.context_len
      if (!ctx_len) return error({ message: "Failed to get context length" })
      let ctx_used = sum / ctx_len
      if (!_.isNumber(ctx_used)) ctx_used = 0
      if (ctx_used > 0.8 && ctx_used < 0.95) {
        mem.memory_indicator = "yellow"
      } else if (ctx_used > 0.95) {
        if (session.settings?.memory?.rag_mode === "full") {
          mem.memory_indicator = "red"
        } else mem.memory_indicator = "yellow"
      } else {
        mem.memory_indicator = "green"
      }
      mem.ctx_used = ctx_used
    })
  }

  useEvent({
    name: ["sessions/change", "sessions/tokensUpdate"],
    action: async ({ target }: { target: string }) => {
      if (target === session_id) await computeUsedMemory()
    },
  })

  useEffect(() => {
    computeUsedMemory()
  }, [mem_session.session?.settings?.memory?.rag_mode])

  useEffect(() => {
    if (input_text) {
      setMessage(input_text)
    }
  }, [input_text])

  // if session is switched
  useEffect(() => {
    if (PROMPT_CACHE[session_id]) {
      setMessage(PROMPT_CACHE[session_id])
    } else {
      setMessage("")
    }
    inputRef?.current?.focus()
  }, [session_id])

  // when message is updated
  useEffect(() => {
    PROMPT_CACHE[session_id] = message
  }, [message])

  // refocus input after answer is complete
  useEffect(() => {
    if (gen_in_progress) inputRef?.current?.blur()
    else
      setTimeout(() => {
        inputRef?.current?.focus()
      }, 100)
  }, [gen_in_progress])

  useEffect(() => {
    computeUsedMemory()
  }, [
    JSON.stringify([mem_session.context.tokens, mem_session.messages.tokens]),
  ])

  function sendMessage() {
    if (gen_in_progress) return
    send({ message })
    setMessage("")
  }

  const button_class =
    "flex inset-y-0 right-0 m-1 text-white focus:outline-none font-medium rounded-lg text-sm pr-4 py-2 saturate-100 hover:saturate-100 animate"

  return (
    <div className="flex flex-1 justify-center items-center">
      <form
        className={
          (
            !gen_in_progress &&
            _.last(messages)?.[1].type === "human" &&
            !is_new_branch
          ) ?
            ""
          : `w-full`
        }
        onSubmit={async (e) => {
          e.preventDefault()
          sendMessage()
        }}
      >
        <div
          className={`flex flex-row backdrop-blur bg-zinc-700/30 bg-opacity-80 border border-zinc-900 border-t-zinc-700 rounded-lg items-center ${
            (
              !gen_in_progress &&
              _.last(messages)?.[1].type === "human" &&
              !is_new_branch
            ) ?
              "hover:bg-zinc-700/50 hover:border-t-zinc-600"
            : ""
          }`}
        >
          {(
            !gen_in_progress &&
            _.last(messages)?.[1].type === "human" &&
            !is_new_branch
          ) ?
            null
          : <RichTextarea
              tabIndex={1}
              id="input"
              style={{ width: "100%", resize: "none" }}
              onFocus={(e) => {
                e.target.focus()
              }}
              onChange={(e: any) => {
                emit({
                  type: "sessions/updateInputText",
                  data: {
                    target: session_id,
                    text: e.target.value,
                  },
                })
                setMessage(e.target.value)
              }}
              value={message}
              autoComplete="off"
              rows={1}
              onKeyDown={(e) => {
                if (e.ctrlKey) {
                  e.preventDefault()
                  // is element focused
                  if (document.activeElement?.id === "input")
                    document.getElementById("input")?.blur()
                }
                const key =
                  e.code +
                  (e.shiftKey ? "Shift" : "") +
                  (e.ctrlKey ? "Ctrl" : "") +
                  (e.altKey ? "Alt" : "")

                switch (key) {
                  case "Enter":
                    e.preventDefault()
                    sendMessage()
                    break
                  default:
                    break
                }
              }}
              autoHeight
              disabled={
                disabled ||
                gen_in_progress ||
                (_.last(messages)?.[1].type === "human" &&
                  _.last(messages)?.[1].hash !== "1337")
              }
              className={`flex flex-1 p-4 py-3 bg-transparent text-xs border-0 rounded  placeholder-zinc-400 text-zinc-300 outline-none focus:outline-none ring-0 shadow-transparent ph-no-capture `}
              placeholder={
                (
                  disabled ||
                  gen_in_progress ||
                  (_.last(messages)?.[1].type === "human" &&
                    _.last(messages)?.[1].hash !== "1337")
                ) ?
                  "thinking..."
                : "Type a message"
              }
            />}
          <Switch>
            <Match
              when={!gen_in_progress && _.last(messages)?.[1].hash === "1337"}
            >
              <button
                type="submit"
                className={button_class + " tooltip tooltip-top"}
                data-tip="Send message"
              >
                <img src={MessageIcon} className="w-5 h-5 rotate-90" />
              </button>
            </Match>
            <Match when={gen_in_progress}>
              <button
                onClick={() => {
                  // if (typeof genController?.abort === "function") genController.abort()
                  if (
                    typeof mem_session.generation.controller?.abort ===
                    "function"
                  )
                    mem_session.generation.controller.abort()
                }}
                disabled={false}
                type="submit"
                className={button_class}
              >
                Stop
              </button>
            </Match>
            <Match
              when={
                !gen_in_progress &&
                (_.last(messages)?.[1].type === "ai" || _.size(messages) === 0)
              }
            >
              <div className="InputActions flex flex-row gap-2 mr-3">
                <button>{/* <AISelector session_id={session_id} /> */}</button>
                <div
                  className="flex flex-col justify-center items-center mr-0.5 tooltip tooltip-top  w-[15px]"
                  data-tip={`Using ${module_name}.\n${
                    memory_indicator !== "red" ?
                      `${ctx_used > 1 ? 100 : _.round(ctx_used * 100)}% of memory used`
                    : session.settings?.memory?.rag_mode === "full" ?
                      `Current reasoning engine out of memory.\nYou need minimum ${_.round(
                        ctx_sum * 0.8,
                      )} word memory\nto continue.\n\nYou can also switch to relevance mode.`
                    : `Relevance mode activate.\n100% of memory used.`
                  }`}
                >
                  <RiRobot2Fill
                    className={`w-[12px] cursor-pointer ${
                      memory_indicator === "yellow" && "text-yellow-400"
                    } ${memory_indicator === "green" && "text-green-400"}  ${
                      memory_indicator === "red" && "text-red-400"
                    }`}
                    onClick={() => {
                      /* const d = document.getElementById(`session-${session_id}-ai-select`) as HTMLDialogElement | null
                      d && d.showModal() */
                      emit({
                        type: "settings/toggle",
                        data: {
                          target: session_id,
                        },
                      })
                    }}
                  />
                </div>
                <div
                  className="flex flex-col justify-center mr-0.5 tooltip tooltip-top w-[15px]"
                  data-tip={`Total cost: $${_.sumBy(
                    session.receipts,
                    (l) => l.cost_usd,
                  ).toFixed(8)}\nTotal tokens used: ${_.sumBy(
                    session.receipts,
                    (l) => l.details.input.tokens + l.details.output.tokens,
                  ).toFixed(0)}`}
                  onClick={async (e) => {
                    e.preventDefault()
                  }}
                >
                  <img
                    src={PieIcon}
                    className="saturate-0 hover:saturate-100"
                  />
                </div>
                <button
                  className="tooltip tooltip-top  w-[15px]"
                  data-tip="Clear message history"
                  onClick={async (e) => {
                    e.preventDefault()
                    if (
                      confirm(
                        "Are you sure you want to clear the message history? You can't undo this.",
                      )
                    ) {
                      // await SessionActions.clearMessages({ session_id })
                      await emit({
                        type: "sessions.clearMessages",
                        data: {
                          session_id,
                        },
                      })
                      // setMsgUpdateTs(new Date().getTime())
                      mem_session.generation.msg_update_ts =
                        new Date().getTime()
                    }
                  }}
                >
                  <img
                    src={RewindIcon}
                    className="saturate-0 hover:saturate-100"
                  />
                </button>
                <button
                  type="submit"
                  className={"tooltip tooltip-top w-[15px]"}
                  data-tip={
                    message.length !== 0 && memory_indicator !== "red" ?
                      `Send message`
                    : "No message or\nmemory full"
                  }
                  disabled={message.length === 0 || memory_indicator === "red"}
                >
                  <img src={MessageIcon} className="rotate-90" />
                </button>
              </div>
            </Match>
            <Match
              when={
                !gen_in_progress &&
                _.last(messages)?.[1].type === "human" &&
                !is_new_branch
              }
            >
              <button type="submit" className={button_class + " text-xs pl-4"}>
                Resend message
              </button>
            </Match>
          </Switch>
        </div>
      </form>
    </div>
  )
}
