import Input from "@/components/workspace/sessions/chat/input"
import { ChatT, SessionsT, TextMessageT } from "@/data/loaders/sessions"
import _ from "lodash"
import AutoScroll from "@brianmcallister/react-auto-scroll"
import { useEffect, useRef, useState } from "react"
import ConversationTree from "@/components/workspace/sessions/chat/convotree"
import { nanoid } from "nanoid"
import { buildMessageTree } from "@/components/libraries/computeMessageChain"
import { useLoaderData, useNavigate, useParams } from "react-router-dom"
import SessionsActions from "@/data/actions/sessions"
import { SessionState } from "@/data/loaders"
import useClipboardApi from "use-clipboard-api"
import { Module } from "@/modules/"
import { UserT } from "@/data/loaders/user"
import { FaUser } from "react-icons/fa"
import { ModuleS } from "@/data/schemas/modules"
import { z } from "zod"
import { Link } from "react-router-dom"
import generateLLMModuleOptions from "@/components/libraries/generateLLMModuleOptions"
import { WorkspaceS } from "@/data/schemas/workspace"
import { error } from "@/components/libraries/logging"
import { main as CostEstimator, InputT as CostEstimatorInputT } from "@/modules/openai-cost-estimator/"

const padding = 50

export type MessageRowT = [TextMessageT[], TextMessageT, TextMessageT[]]

export default function Chat() {
  const { sessions_state, user_state } = useLoaderData() as { sessions_state: SessionsT; user_state: UserT }
  const [msg_update_ts, setMsgUpdateTs] = useState<number>(0)
  const workspace_id = useParams().workspace_id as string
  const session_id = useParams().session_id as string
  const [workspace, setWorkspace] = useState<z.infer<typeof WorkspaceS>>(
    user_state.workspaces.find((w) => w.id === workspace_id) as z.infer<typeof WorkspaceS>
  )
  const [session, setSession] = useState(sessions_state.active[session_id])
  const [messages, setMessages] = useState<MessageRowT[] | undefined>([])
  const [branch_parent_id, setBranchParentId] = useState<boolean | string>(false)
  const [gen_in_progress, setGenInProgress] = useState<boolean>(false)
  const [value, copy] = useClipboardApi()
  const [participants, setParticipants] = useState<{ [key: string]: React.ReactElement }>({
    user: <FaUser />,
    AI: <FaUser />,
  })

  const eInput = useRef<HTMLDivElement | null>(null)
  const eContainer = useRef<HTMLDivElement | null>(null)
  const [input_height, setInputHeight] = useState<number>(eInput?.current?.offsetHeight || 0)
  const [container_height, setContainerHeight] = useState<number>(
    eContainer?.current?.offsetHeight ? eContainer?.current?.offsetHeight - 80 : 0
  )
  const [genController, setGenController] = useState<any>(undefined)

  const navigate = useNavigate()

  const [api_key, setApiKey] = useState<string>("")

  const [module, setModule] = useState<{ specs: z.infer<typeof ModuleS>; main: Function } | undefined>(undefined)

  const [msgs_in_mem, setMsgsInMem] = useState<string[]>([])

  // keep track of input height
  useEffect(() => {
    const e_input = eInput.current
    if (!e_input) return
    const input_observer = new ResizeObserver(() => {
      // console.log("input height changed", e_input.offsetHeight)
      setInputHeight(e_input.offsetHeight)
    })
    setInputHeight(e_input.offsetHeight)
    input_observer.observe(e_input)

    const e_container = eContainer.current
    if (!e_container) return
    const container_observer = new ResizeObserver(() => {
      // console.log("container height changed", e_container.offsetHeight)
      setContainerHeight(e_container.offsetHeight)
    })
    setContainerHeight(e_container.offsetHeight)
    container_observer.observe(e_container)
  }, [eInput?.current?.offsetHeight])

  // set module
  useEffect(() => {
    const module = Module(session?.settings.module.id)
    if (!module) return
    setModule(module)
  }, [session?.settings.module])

  // set api key
  useEffect(() => {
    if (!module) return
    const api_key = _.find(user_state.modules.installed, { id: module?.specs.id })?.settings?.api_key
    if (!api_key) return
    setApiKey(api_key)
  }, [JSON.stringify([user_state.modules.installed, module])])

  // Update participants
  useEffect(() => {
    const p: { [key: string]: React.ReactElement } = {
      user: <FaUser />,
      AI: <FaUser />,
    }
    if (!messages) return
    if (!module) return
    messages.forEach((ms) => {
      const m = ms[1]
      if (m.source && !p[m.source] && module.specs.meta.vendor?.name === m.source) {
        p[m.source] = module.specs.meta.icon ? (
          <img src={module.specs.meta.icon} className="w-3 h-3 bg-zinc-200" />
        ) : (
          <FaUser />
        )
      }
    })
    setParticipants(p)
  }, [JSON.stringify(messages)])

  async function compileSlidingWindowMemory({ model, prompt, messages }: any) {
    // get module variant's token count
    const variant = _.find(module?.specs.meta.variants, { id: model })
    if (!variant) return error({ message: "variant not found", data: { model } })
    const context_len = variant.context_len
    if (!context_len) return error({ message: "context_len not found", data: { model } })

    // reverse messages
    const history = _.reverse(messages)

    // for each message, calculate token count and USD cost
    const msgs: { role: "system" | "user" | "assistant"; content: string }[] = []
    let token_count = 0
    let usd_cost = 0

    // compute instructions if any
    if (prompt?.instructions) {
      const costs = await CostEstimator({ model, messages: [{ role: "system", content: prompt.instructions }] })
      token_count += costs.tokens
      usd_cost += costs.usd
    }
    if (token_count > context_len) return error({ message: "instructions too long", data: { model } })

    const included_ids: string[] = []
    for (let i = 0; i < history.length; i++) {
      const m = history[i]
      let tmp_m: { role: "system" | "user" | "assistant"; content: string } = {
        role: m.type === "human" ? "user" : "assistant",
        content: m.text,
      }
      const costs = await CostEstimator({ model, messages: [tmp_m] })

      // when token count goes over selected model's token limit, stop
      if (token_count + costs.tokens > context_len) break
      token_count += costs.tokens
      usd_cost += costs.usd
      msgs.push(m)
      included_ids.push(m.id)
    }

    // if the latest message is type ai, remove it
    if (history[history.length - 1]?.type === "ai") msgs.pop()
    setMsgsInMem(included_ids)
    return { history: msgs.reverse(), included_ids, token_count, usd_cost }
  }

  async function addMessage({ message }: { message: string }) {
    if (!api_key) return
    if (!module) throw new Error("No module")
    // if no activePath, use first as parent id
    let parent_id = "first"
    // if activePath exists, set parent id as the last message id in the chain
    if (messages && messages.length > 0) parent_id = messages[messages.length - 1][1].id
    // unless branch parent id is set, then message should use that
    if (branch_parent_id) parent_id = branch_parent_id as string

    // sanity check, get parent message
    let resend = false
    if (parent_id !== "first") {
      const parent_msg = session?.messages?.find((msg) => msg.id === parent_id)
      if (parent_msg?.type === "human") {
        console.log("resending")
        resend = true
      } else if (!parent_msg && session?.messages?.length > 0) {
        console.log("no parent")
        return
      }
    }

    if (message || resend) {
      let m: TextMessageT | undefined = undefined
      setGenInProgress(true)
      if (resend) m = _.last(messages)?.[1]
      else
        m = await SessionsActions.addMessage({
          session_id,
          message: {
            type: "human",
            hash: "123",
            text: message,
            source: "user",
            active: true,
            parent_id,
          },
        })
      setMsgUpdateTs(new Date().getTime())
      if (m) {
        let stream_response = ""
        function onData({ data }: { data: any }) {
          if (data) {
            stream_response += data
            SessionsActions.updateTempMessage({
              session_id,
              message: {
                _v: 1,
                id: "temp",
                version: "1.0",
                type: "ai",
                hash: "123",
                text: data,
                source: module?.specs?.meta?.vendor?.name || module?.specs.meta.name || "unknown",
                parent_id: m?.id || "",
              },
            })
            setMsgUpdateTs(new Date().getTime())
          }
        }
        let has_error = false
        const prompt = {
          instructions: "you are a helpful assistant",
          user: m.text,
        }
        const memory = await compileSlidingWindowMemory({
          model: session?.settings.module.variant,
          prompt,
          messages: _.map(messages, (m) => m[1]),
        })
        console.info(`Message tokens: ${memory?.token_count}, USD: $${memory?.usd_cost}`)
        const response = await module?.main(
          {
            model: session?.settings.module.variant,
            api_key,
            prompt,
            history: memory?.history || [],
          },
          {
            setGenController,
            onData,
            onClose: () => {},
            onError: (data: any) => {
              has_error = true
              error({ message: data.message || data.code, data })
            },
          }
        )
        setGenInProgress(false)

        if (response || stream_response) {
          const aim: TextMessageT = await SessionsActions.addMessage({
            session_id,
            message: {
              type: "ai",
              hash: "123",
              text: response || stream_response,
              source: module?.specs?.meta?.vendor?.name || module?.specs.meta.name || "unknown",
              parent_id: m.id,
            },
          })
          setBranchParentId(false)
          setMsgUpdateTs(new Date().getTime())
        } else if (!has_error && !response && !stream_response) {
          error({ message: "no response from the module", data: { module_id: module.specs.id } })
        }
      }
    }
  }

  // Handle copy/paste
  useEffect(() => {
    if (value)
      setTimeout(() => {
        copy("")
        window?.getSelection()?.empty()
      }, 1000)
  }, [value])

  // Update local session state when sessions[session_id] changes
  const updateSessions = async () => {
    const s = await SessionState.get()
    setSession(s.active[session_id])
  }
  useEffect(() => {
    updateSessions()
  }, [JSON.stringify([sessions_state.active[session_id], msg_update_ts])])

  // Build message tree
  const computeActivePath = (messages: TextMessageT[]): Record<string, string> => {
    const activePath: Record<string, string> = {}

    // find message with parent_id = "first"
    const first_msg = _.find(messages, { parent_id: "first" })
    if (!first_msg) return activePath
    activePath["first"] = first_msg.id

    // find the next message in the chain using first_msg.id and add it to activePath
    function findNextMessage(msg_id: string) {
      const next_msgs = _.filter(messages, { parent_id: msg_id })
      if (next_msgs.length === 0) return
      // find the first active message
      const next_msg = _.find(next_msgs, { active: true })
      if (next_msg) {
        activePath[msg_id] = next_msg.id
        findNextMessage(next_msg.id)
      } else {
        // find the first message
        const next_msg = next_msgs[0]
        activePath[msg_id] = next_msg.id
        findNextMessage(next_msg.id)
      }
    }
    findNextMessage(first_msg.id)

    return activePath
  }
  useEffect(() => {
    // recursively find all active messages starting from the msg with parent_id = "first"
    const activePath = computeActivePath(session?.messages || [])

    let rows = buildMessageTree({ messages: session?.messages || [], first_id: "first", activePath })
    setMessages(rows)

    // console.log("update messages", session_id, rows, session?.messages, activePath)
  }, [JSON.stringify(session)])

  /*  
 // compute sliding window memory when messages change
 useEffect(() => {
    if (!module) return
    if (!session?.settings.module.variant) return
    if (!messages) return
    compileSlidingWindowMemory({ model: session?.settings.module.variant, messages: messages.map((m) => m[1]) })
  }, [JSON.stringify([module, session?.settings.module.variant, session_id, branch_parent_id])]) */

  // Declare a state variable for dimensions
  const [height, setHeight] = useState(
    window.innerHeight -
      ((document.getElementById("Tabs")?.clientHeight || 55) + (document.getElementById("Input")?.clientHeight || 55)) -
      padding +
      "px"
  )

  // Function to handle the window resize event
  const handleResize = () => {
    setHeight(
      window.innerHeight -
        ((document.getElementById("Tabs")?.clientHeight || 55) +
          (document.getElementById("Input")?.clientHeight || 55)) -
        padding +
        "px"
    )
  }
  // useEffect to add and remove the event listener
  useEffect(() => {
    window.addEventListener("resize", handleResize)

    // Cleanup function to remove the event listener when the component unmounts
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  const onBranchClick = async (msg_id: string) => {
    let c: ChatT = _.cloneDeep(session)

    // follow activePath from active_path_branch_id to the end and mark all human messages as inactive
    function markBranchInactive(msg_id: string) {
      // find active sibling from the branch
      const msg = _.find(c.messages, { id: msg_id })
      if (msg?.type === "human") {
        // get all siblings
        const siblings = _.filter(c.messages, { parent_id: msg?.parent_id })
        // mark all siblings as inactive in c.messages
        siblings.forEach((sibling) => {
          sibling.active = false
          const i = _.findIndex(c.messages, { id: sibling.id })
          c.messages[i] = sibling
        })
        // find all children of the siblings
        const children = _.filter(c.messages, (m) => _.includes(_.map(siblings, "id"), m.parent_id))
        // mark all children as inactive in c.messages
        children.forEach((child) => {
          markBranchInactive(child.id)
        })
      } else {
        // find all children of the message
        const children = _.filter(c.messages, (m) => m.parent_id === msg_id)
        // mark all children as inactive in c.messages
        children.forEach((child) => {
          markBranchInactive(child.id)
        })
      }
    }
    markBranchInactive(msg_id)

    // mark other messages with same parent_id as not active and the clicked one as active
    c.messages = _.map(c.messages, (message) => {
      if (message.parent_id === c.messages.find((msg) => msg.id === msg_id)?.parent_id) {
        message.active = false
      }
      if (message.id === msg_id) {
        message.active = true
      }
      return message
    })
    await SessionsActions.updateMessages({ session_id, messages: c.messages })
    /* compileSlidingWindowMemory({ model: session?.settings.module.variant, messages: c.messages }) */
    setBranchParentId(false)
    setMsgUpdateTs(new Date().getTime())
  }

  const onNewBranchClick = async (parent_id: string) => {
    const newParentMessage: TextMessageT = {
      _v: 1,
      id: nanoid(),
      version: "1.0",
      type: "human",
      text: "type your new message...",
      source: "example",
      parent_id,
      signature: "",
      hash: "1337",
      active: true,
    }
    let c: ChatT = _.cloneDeep(session)
    // mark other messages with same parent_id as not active
    c.messages = _.map(c.messages, (message) => {
      if (message.parent_id === parent_id) {
        message.active = false
      }
      return message
    })
    c.messages.push(newParentMessage)
    /*     compileSlidingWindowMemory({ model: session?.settings.module.variant, messages: c.messages }) */
    setSession(c)
    setBranchParentId(parent_id)
  }

  const handleModuleChange = async ({ value }: { value: string }) => {
    const new_llm_module = JSON.parse(value)

    // update session default module
    const new_session = _.cloneDeep(session)
    new_session.settings.module = new_llm_module

    // update session in sessions
    const new_sessions = _.cloneDeep(sessions_state)
    new_sessions.active[session_id] = new_session
    await SessionsActions.updateSessions(new_sessions)

    navigate(`/conductor/${workspace_id}/${session_id}`)
  }

  if (!session || !module) return null
  // style={{'marginBottom': '80px'}}
  return (
    <div className="flex flex-1 flex-col pt-2 relative" ref={eContainer}>
      <div className="flex flex-1">
        <AutoScroll showOption={false} scrollBehavior="auto" className={`flex flex-1`}>
          {messages && messages?.length > 0 ? (
            <div className="flex flex-grow text-xs justify-center items-center text-zinc-500 pb-4">
              Active module: <select
                    className="flex border rounded-lg px-2 ml-2 py-1 bg-zinc-800 border-zinc-700 placeholder-zinc-400 text-white text-xs"
                    defaultValue={
                      workspace.defaults?.llm_module?.id
                        ? `{"id": "${workspace.defaults?.llm_module?.id}", "variant": "${workspace.defaults?.llm_module?.variant}"}`
                        : "click to select"
                    }
                    onChange={(data) => {
                      handleModuleChange({
                        value: data.target.value,
                      })
                    }}
                  >
                    {generateLLMModuleOptions({ user_state })}
                  </select>
            </div>
          ) : null}
          <div className="Messages flex flex-1 flex-col" style={{ height }}>
            {messages && messages?.length > 0 ? (
              <ConversationTree
                rows={messages}
                onNewBranchClick={onNewBranchClick}
                onBranchClick={onBranchClick}
                participants={participants}
                paddingBottom={input_height + 30}
                msgs_in_mem={msgs_in_mem}
              />
            ) : api_key ? (
              <div className="flex h-full flex-col justify-center items-center">
                <div className="flex text-zinc-500 font-semibold text-sm pb-2">Select AI to chat with...</div>
                <div className="flex">
                  <select
                    className="flex border rounded-lg p-2 bg-zinc-800 border-zinc-700 placeholder-zinc-400 text-white text-xs"
                    defaultValue={
                      workspace.defaults?.llm_module?.id
                        ? `{"id": "${workspace.defaults?.llm_module?.id}", "variant": "${workspace.defaults?.llm_module?.variant}"}`
                        : "click to select"
                    }
                    onChange={(data) => {
                      handleModuleChange({
                        value: data.target.value,
                      })
                    }}
                  >
                    {generateLLMModuleOptions({ user_state })}
                  </select>
                </div>
                <div className="flex mt-5 flex-col justify-center items-center gap-4">
                  <div className="text-xs text-zinc-400">
                    <kbd className="kbd kbd-xs">Alt</kbd> + <kbd className="kbd kbd-xs">N</kbd> new session
                  </div>
                  <div className="text-xs text-zinc-400">
                    <kbd className="kbd kbd-xs">Alt</kbd> + <kbd className="kbd kbd-xs">R</kbd> rename session
                  </div>
                  <div className="text-xs text-zinc-400">
                    <kbd className="kbd kbd-xs">Alt</kbd> + <kbd className="kbd kbd-xs">W</kbd> close session
                  </div>
                  <div className="text-xs text-zinc-400">
                  <kbd className="kbd kbd-xs">Shift</kbd> + <kbd className="kbd kbd-xs">Alt</kbd> + <kbd className="kbd kbd-xs">D</kbd> delete session
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-full flex-col gap-2">
                <div className="text-zinc-500">
                  No API key for {module?.specs.meta.vendor?.name || module?.specs.meta.name} module
                </div>
                <div className="text-sm">
                  <Link to="/conductor/settings">
                    Setup {module?.specs.meta.vendor?.name || module?.specs.meta.name} module
                  </Link>
                </div>
              </div>
            )}
          </div>
        </AutoScroll>
      </div>
      <div
        id="Input"
        ref={eInput}
        className={`absolute bottom-0 left-0 right-0 my-4 px-4 ${!api_key ? "opacity-25" : ""}`}
      >
        <Input
          send={addMessage}
          session_id={session_id}
          messages={messages}
          gen_in_progress={gen_in_progress}
          is_new_branch={branch_parent_id}
          disabled={!api_key}
          genController={genController}
        />
      </div>
    </div>
  )
}
