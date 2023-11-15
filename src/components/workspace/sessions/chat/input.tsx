import { useEffect, useState, useRef } from "react"
import _ from "lodash"
import { MessageRowT, SessionsT } from "@/data/schemas/sessions"
import { Switch, Match } from "react-solid-flow"
import { RichTextarea } from "rich-textarea"
import RewindIcon from "@/assets/icons/rewind.svg"
import MessageIcon from "@/assets/icons/send.svg"
import SessionActions from "@/data/actions/sessions"
import PieIcon from "@/assets/icons/pie.svg"
import { ChatT } from "@/data/loaders/sessions"
import { AISelector, AISelectorButton } from "./ai_selector"
import { emit } from "@/libraries/events"

let PROMPT_CACHE: { [key: string]: string } = {}

export default function Input({
  session_id,
  messages,
  send,
  gen_in_progress,
  is_new_branch,
  genController,
  disabled,
  input_text,
  setMsgUpdateTs,
  session,
}: {
  session_id: string
  messages: MessageRowT[] | undefined
  send: Function
  gen_in_progress: boolean
  is_new_branch: boolean | string
  genController: any
  disabled?: boolean
  input_text?: string
  setMsgUpdateTs: Function
  session: SessionsT["active"][0]
}) {
  const [message, setMessage] = useState<string>("")
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

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
        className={!gen_in_progress && _.last(messages)?.[1].type === "human" && !is_new_branch ? "" : `w-full`}
        onSubmit={async (e) => {
          e.preventDefault()
          sendMessage()
        }}
      >
        <div
          className={`flex flex-row backdrop-blur bg-zinc-700/30 bg-opacity-80 border border-zinc-900 border-t-zinc-700 rounded-lg items-center ${
            !gen_in_progress && _.last(messages)?.[1].type === "human" && !is_new_branch
              ? "hover:bg-zinc-700/50 hover:border-t-zinc-600"
              : ""
          }`}
        >
          {!gen_in_progress && _.last(messages)?.[1].type === "human" && !is_new_branch ? null : (
            <RichTextarea
              tabIndex={1}
              id="input"
              style={{ width: "100%", resize: "none" }}
              onFocus={(e) => {
                e.target.focus()
              }}
              onChange={(e: any) => {
                setMessage(e.target.value)
              }}
              value={message}
              autoComplete="off"
              rows={1}
              onKeyDown={(e) => {
                if (e.ctrlKey) {
                  e.preventDefault()
                  // is element focused
                  if (document.activeElement?.id === "input") document.getElementById("input")?.blur()
                }
                const key = e.code + (e.shiftKey ? "Shift" : "") + (e.ctrlKey ? "Ctrl" : "") + (e.altKey ? "Alt" : "")

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
                (_.last(messages)?.[1].type === "human" && _.last(messages)?.[1].hash !== "1337")
              }
              className={`flex flex-1 p-4 py-3 bg-transparent text-xs border-0 rounded  placeholder-zinc-400 text-zinc-300 outline-none focus:outline-none ring-0 shadow-transparent ph-no-capture `}
              placeholder={
                disabled ||
                gen_in_progress ||
                (_.last(messages)?.[1].type === "human" && _.last(messages)?.[1].hash !== "1337")
                  ? "thinking..."
                  : "Type a message"
              }
            />
          )}
          <Switch>
            <Match when={!gen_in_progress && _.last(messages)?.[1].hash === "1337"}>
              <button type="submit" className={button_class + " tooltip tooltip-top"} data-tip="Send message">
                <img src={MessageIcon} className="w-5 h-5 rotate-90" />
              </button>
            </Match>
            <Match when={gen_in_progress}>
              <span
                className="tooltip tooltip-top"
                data-tip="Temporarily disabled due to technical issues with LLM provider"
              >
                <button
                  onClick={() => {
                    // if (typeof genController?.abort === "function") genController.abort()
                  }}
                  disabled={true}
                  type="submit"
                  className={button_class}
                >
                  Stop
                </button>
              </span>
            </Match>
            <Match when={!gen_in_progress && (_.last(messages)?.[1].type === "ai" || _.size(messages) === 0)}>
              <div className="flex flex-row gap-2">
                <button>{/* <AISelector session_id={session_id} /> */}</button>
                <button
                  className="tooltip tooltip-top"
                  data-tip={`Total cost: $${_.sumBy(session.receipts, (l) => l.cost_usd).toFixed(
                    2
                  )}\nTotal tokens used: ${_.sumBy(
                    session.receipts,
                    (l) => l.details.input.tokens + l.details.output.tokens
                  ).toFixed(0)}`}
                  onClick={async (e) => {
                    e.preventDefault()
                  }}
                >
                  <img src={PieIcon} className="w-5 h-5 saturate-0 hover:saturate-100" />
                </button>
                <button
                  className="tooltip tooltip-top"
                  data-tip="Clear message history"
                  onClick={async (e) => {
                    e.preventDefault()
                    if (confirm("Are you sure you want to clear the message history? You can't undo this.")) {
                      // await SessionActions.clearMessages({ session_id })
                      await emit({
                        type: 'sessions.clearMessages',
                        data: {
                          session_id
                        }
                      })
                      setMsgUpdateTs(new Date().getTime())
                    }
                  }}
                >
                  <img src={RewindIcon} className="w-5 h-5 saturate-0 hover:saturate-100" />
                </button>
                <button type="submit" className={button_class + " tooltip tooltip-top"} data-tip="Send message">
                  <img src={MessageIcon} className="w-5 h-5 rotate-90" />
                </button>
              </div>
            </Match>
            <Match when={!gen_in_progress && _.last(messages)?.[1].type === "human" && !is_new_branch}>
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
