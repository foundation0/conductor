import { useEffect, useState, useRef } from "react"
import _ from "lodash"
import { MessageRowT } from "@/components/workspace/sessions/chat"
import { Switch, Match } from "react-solid-flow"
import MessageIcon from "@/assets/icons/message.svg"

function checkForLocalStorage() {
  try {
    localStorage.setItem("test", "test")
    localStorage.removeItem("test")
    return true
  } catch (e) {
    return false
  }
}

let PROMPT_CACHE: { [key: string]: string } = {}

export default function Input({
  session_id,
  messages,
  send,
  gen_in_progress,
  is_new_branch,
  genController,
  disabled,
}: {
  session_id: string
  messages: MessageRowT[] | undefined
  send: Function
  gen_in_progress: boolean
  is_new_branch: boolean | string
  genController: any
  disabled: boolean
}) {
  const [message, setMessage] = useState<string>("")
  const [rows, setRows] = useState<number>(1)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  // if session is switched
  useEffect(() => {
    if (PROMPT_CACHE[session_id]) setMessage(PROMPT_CACHE[session_id])
    else setMessage("")
    inputRef?.current?.focus()
    // updateSession()
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

  function handleKeyDown(event: any) {
    if (event.target.value.trim() === "") setRows(1)
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
      return
    }

    // optimize textarea height
    const textarea = event.target
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight)
    const padding = parseInt(getComputedStyle(textarea).paddingTop) + parseInt(getComputedStyle(textarea).paddingBottom)
    const border =
      parseInt(getComputedStyle(textarea).borderTopWidth) + parseInt(getComputedStyle(textarea).borderBottomWidth)
    const contentHeight = textarea.scrollHeight - padding - border
    const area_rows = Math.floor(contentHeight / lineHeight)

    if(rows != area_rows) {
      setRows(area_rows)
    } else if (event.target.value.split("\n").length !== rows) setRows(event.target.value.split("\n").length)
  }

  function sendMessage() {
    if (gen_in_progress) return
    send({ message })
    setMessage("")
    setRows(1)
  }

  const button_class =
    "flex inset-y-0 right-0 m-1 text-white focus:outline-none font-medium rounded-lg text-sm px-4 py-2 saturate-50 hover:saturate-100 animate"

  return (
    <div className="flex flex-1 justify-center items-center">
      <form
        className={(!gen_in_progress && _.last(messages)?.[1].type === "human" && !is_new_branch) ? "" : `w-full`}
        onSubmit={async (e) => {
          e.preventDefault()
          // if (message === "") return
          sendMessage()
        }}
      >
        <div className={`flex flex-row backdrop-blur bg-zinc-700/30 bg-opacity-80 border border-zinc-900 border-t-zinc-700 rounded-lg items-center ${(!gen_in_progress && _.last(messages)?.[1].type === "human" && !is_new_branch) ? "hover:bg-zinc-700/50 hover:border-t-zinc-600" : ''}`}>
          <textarea
            ref={inputRef}
            rows={rows}
            id="input"
            className={`flex flex-1 p-4 py-3 bg-transparent text-xs border-0 rounded  placeholder-zinc-400 text-zinc-300 outline-none focus:outline-none ring-0 shadow-transparent ${(!gen_in_progress && _.last(messages)?.[1].type === "human" && !is_new_branch) ? "hidden" : ''}`}
            placeholder={
              disabled ||
              gen_in_progress ||
              (_.last(messages)?.[1].type === "human" && _.last(messages)?.[1].hash !== "1337")
                ? "..."
                : "Type a message"
            }
            required
            onChange={(e) => {
              setMessage(e.target.value)
              handleKeyDown(e)
            }}
            value={message}
            autoComplete="off"
            style={{ resize: "none", height: "auto" }}
            onKeyDown={handleKeyDown}
            disabled={
              disabled ||
              gen_in_progress ||
              (_.last(messages)?.[1].type === "human" && _.last(messages)?.[1].hash !== "1337")
            }
          />
          <Switch>
            <Match when={!gen_in_progress && _.last(messages)?.[1].hash === "1337"}>
              <button type="submit" className={button_class}>
                <img src={MessageIcon} className="w-4 h-4" />
              </button>
            </Match>
            <Match when={gen_in_progress}>
              <button
                onClick={() => {
                  if (typeof genController?.abort === "function") genController.abort()
                }}
                type="submit"
                className={button_class}
              >
                Stop
              </button>
            </Match>
            <Match when={!gen_in_progress && (_.last(messages)?.[1].type === "ai" || _.size(messages) === 0)}>
              <button type="submit" className={button_class}>
              <img src={MessageIcon} className="w-6 h-6" />
              </button>
            </Match>
            <Match when={!gen_in_progress && _.last(messages)?.[1].type === "human" && !is_new_branch}>
              <button type="submit" className={button_class + ' text-xs'}>
                Resend message
              </button>
            </Match>
          </Switch>
        </div>
      </form>
    </div>
  )
}
