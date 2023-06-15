import { useEffect, useState, useRef } from "react"
import _ from "lodash"
import { MessageRowT } from "@/components/workspace/sessions/chat"
import { Switch, Match } from "react-solid-flow"

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
  disabled,
}: {
  session_id: string
  messages: MessageRowT[] | undefined
  send: Function
  gen_in_progress: boolean
  is_new_branch: boolean | string
  disabled: boolean
}) {
  const [message, setMessage] = useState<string>("")

  const inputRef = useRef<HTMLInputElement | null>(null)

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

  return (
    <div className="flex flex-1">
      <form
        className="w-full"
        onSubmit={async (e) => {
          e.preventDefault()
          // if (message === "") return
          if (gen_in_progress) return
          send({ message })
          setMessage("")
        }}
      >
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            id="input"
            className="w-full p-4 py-3 text-sm border-0 rounded bg-zinc-700 placeholder-zinc-400 text-zinc-300 outline-none focus:outline-none ring-0 shadow-transparent"
            placeholder={
              disabled ||
              gen_in_progress ||
              (_.last(messages)?.[1].type === "human" && _.last(messages)?.[1].hash !== "1337")
                ? "..."
                : "Type a message"
            }
            required
            onChange={(e) => setMessage(e.target.value)}
            value={message}
            autoComplete="off"
            disabled={
              disabled ||
              gen_in_progress ||
              (_.last(messages)?.[1].type === "human" && _.last(messages)?.[1].hash !== "1337")
            }
          />
          <Switch>
            <Match when={!gen_in_progress && _.last(messages)?.[1].hash === "1337"}>
              <button
                type="submit"
                className="absolute inset-y-0 right-0 m-1 text-white  focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-4 py-2  dark:focus:ring-blue-800"
              >
                Send
              </button>
            </Match>
            <Match when={gen_in_progress}>
              <button
                disabled={true}
                type="submit"
                className="absolute inset-y-0 right-0 m-1 text-white  focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-4 py-2  dark:focus:ring-blue-800"
              >
                Generating...
              </button>
            </Match>
            <Match when={!gen_in_progress && (_.last(messages)?.[1].type === "ai" || _.size(messages) === 0)}>
              <button
                type="submit"
                className="absolute inset-y-0 right-0 m-1 text-white  focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-4 py-2  dark:focus:ring-blue-800"
              >
                Send
              </button>
            </Match>
            <Match when={!gen_in_progress && _.last(messages)?.[1].type === "human" && !is_new_branch}>
              <button
                type="submit"
                className="absolute inset-y-0 right-0 m-1 text-white  focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-4 py-2  dark:focus:ring-blue-800"
              >
                Resend
              </button>
            </Match>
          </Switch>
        </div>
      </form>
    </div>
  )
}
