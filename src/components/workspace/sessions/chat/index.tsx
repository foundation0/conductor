import Input from "@/components/workspace/sessions/chat/input"
import { SessionsT, TextMessageT } from "@/data/loaders/sessions"
import _ from "lodash"
import AutoScroll from "@brianmcallister/react-auto-scroll"
import { useEffect, useRef, useState } from "react"
import ConversationTree from "@/components/workspace/sessions/chat/convotree"
import { nanoid } from "nanoid"
import { buildMessageTree } from "@/components/libraries/compute_message_chain"
import { useLoaderData, useNavigate, useParams } from "react-router-dom"
import SessionsActions from "@/data/actions/sessions"
import { initLoaders } from "@/data/loaders"
import { Module } from "@/modules/"
import { UserT } from "@/data/loaders/user"
import { FaUser } from "react-icons/fa"
import { ModuleS } from "@/data/schemas/modules"
import { z } from "zod"
import { Link } from "react-router-dom"
import generate_llm_module_options from "@/components/libraries/generate_llm_module_options"
import { WorkspaceS } from "@/data/schemas/workspace"
import { fieldFocus } from "@/components/libraries/field_focus"
import { addMessage } from "./add_message"
import PromptIcon from "@/assets/prompt.svg"
import { autoRename } from "./auto_renamer"
import UserActions from "@/data/actions/user"

const padding = 50

export type MessageRowT = [TextMessageT[], TextMessageT, TextMessageT[]]

export default function Chat() {
  const { sessions_state, user_state, MessagesState } = useLoaderData() as {
    sessions_state: SessionsT
    user_state: UserT
    MessagesState: Function
  }
  // setup stores
  const workspace_id = useParams().workspace_id as string
  const session_id = useParams().session_id as string
  const [workspace, setWorkspace] = useState<z.infer<typeof WorkspaceS>>(
    user_state.workspaces.find((w: any) => w.id === workspace_id) as z.infer<typeof WorkspaceS>
  )

  // setup session
  const [session, setSession] = useState(sessions_state.active[session_id] || null)

  // setup messages and generation related states
  const [messages_state, setMessagesStates] = useState<any>()
  const [raw_messages, setRawMessages] = useState<TextMessageT[] | undefined>(messages_state?.get())
  const [processed_messages, setProcessedMessages] = useState<MessageRowT[] | undefined>([])
  const [branch_parent_id, setBranchParentId] = useState<boolean | string>(false)
  const [branch_msg_id, setBranchMsgId] = useState<string>("")
  const [gen_in_progress, setGenInProgress] = useState<boolean>(false)
  const [genController, setGenController] = useState<any>(undefined)
  const [msgs_in_mem, setMsgsInMem] = useState<string[]>([])
  const [msg_update_ts, setMsgUpdateTs] = useState<number>(0)
  const [input_text, setInputText] = useState<string>("")

  // setup participants
  const [participants, setParticipants] = useState<{ [key: string]: React.ReactElement }>({
    user: <FaUser />,
    AI: <FaUser />,
  })

  // setup various layout related states
  const eInput = useRef<HTMLDivElement | null>(null)
  const eContainer = useRef<HTMLDivElement | null>(null)
  const [input_height, setInputHeight] = useState<number>(eInput?.current?.offsetHeight || 0)
  const [container_height, setContainerHeight] = useState<number>(
    eContainer?.current?.offsetHeight ? eContainer?.current?.offsetHeight - 80 : 0
  )
  const [height, setHeight] = useState(
    window.innerHeight -
      ((document.getElementById("Tabs")?.clientHeight || 55) + (document.getElementById("Input")?.clientHeight || 55)) -
      padding +
      "px"
  )

  // setup active module states
  const [api_key, setApiKey] = useState<string>("")
  const [module, setModule] = useState<{ specs: z.infer<typeof ModuleS>; main: Function } | undefined>(undefined)

  const navigate = useNavigate()

  // set focus to input when session changes
  useEffect(() => {
    fieldFocus({ selector: "#input" })
  }, [session_id])

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
    setTimeout(() => fieldFocus({ selector: "#input" }), 200)
  }, [session?.settings.module])

  // change session's active module
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

    // set focus to #input
    setTimeout(() => {
      fieldFocus({ selector: "#input" })
    }, 200)
  }

  // set api key
  useEffect(() => {
    if (!module) return
    const api_key = _.find(user_state.modules.installed, { id: module?.specs.id })?.settings?.api_key
    if (!api_key) return
    setApiKey(api_key)
  }, [JSON.stringify([user_state.modules.installed, module])])

  // when processed messages are updated
  useEffect(() => {
    // Update participants
    const p: { [key: string]: React.ReactElement } = {
      user: <FaUser />,
      AI: <FaUser />,
    }
    if (!processed_messages) return
    if (!module) return
    processed_messages.forEach((ms) => {
      const m = ms[1]
      if (m.source !== "human" && module.specs.meta.vendor?.name === m.source) {
        p[m.source] = module.specs.meta.icon ? (
          <img src={module.specs.meta.icon} className="w-3 h-3 bg-zinc-200" />
        ) : (
          <FaUser />
        )
      } else {
        p["user"] =
          _.size(user_state.meta?.profile_photos) > 0 ? (
            <img src={_.first(user_state.meta?.profile_photos) || ""} className="h-full w-full" />
          ) : (
            <div>{user_state.meta?.username?.[0].toUpperCase()}</div>
          )
      }
    })
    setParticipants(p)
  }, [JSON.stringify(processed_messages)])

  // Update local session state when sessions[session_id] changes
  const updateSession = async () => {
    const { AppState, SessionState, UserState } = await initLoaders()
    const user_state = await UserState.get()
    const workspace = user_state.workspaces.find((w: any) => w.id === workspace_id) as z.infer<typeof WorkspaceS>
    const s = await SessionState.get()
    const ss = await MessagesState({ session_id })
    const msgs: TextMessageT[] = ss?.get()
    setSession(s.active[session_id])
    setRawMessages(_.uniqBy(msgs || [], "id"))
    setMessagesStates(ss)
    const app_state = await AppState.get()
    let session_name = ""
    for (const group of workspace.groups) {
      for (const folder of group.folders) {
        const session = folder.sessions?.find((s) => s.id === session_id)
        if (session) session_name = session.name
      }
    }
    const active_session = _.find(app_state.open_sessions, { session_id: session_id })
    if (_.size(msgs) >= 2 && _.size(msgs) <= 5 && session_name === "Untitled" && active_session) {
      const generated_session_name = await autoRename({ messages: msgs, module, api_key })
      if (generated_session_name) {
        // update session name
        await UserActions.renameItem({
          new_name: generated_session_name,
          group_id: active_session.group_id,
          folder_id: active_session.folder_id,
          session_id,
        })

        navigate(`/conductor/${workspace_id}/${session_id}`)
      }
    }
  }

  useEffect(() => {
    updateSession()
  }, [JSON.stringify([session_id, sessions_state.active[session_id], gen_in_progress, branch_parent_id])])

  // update raw messages when msg_update_ts changes
  useEffect(() => {
    if (!messages_state) return
    const msgs: TextMessageT[] = messages_state?.get()
    setRawMessages(_.uniqBy(msgs || [], "id"))
  }, [msg_update_ts])

  // Build message tree
  const computeActivePath = (messages: TextMessageT[]): Record<string, string> => {
    const activePath: Record<string, string> = {}

    // find message with parent_id = "first"
    const first_msg = _.find(messages, { parent_id: "first" })
    if (!first_msg) {
      return activePath
    }
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

  // update processed messages
  async function updateMessages() {
    const active_path = computeActivePath(raw_messages || [])
    if (!active_path) return
    let rows = buildMessageTree({ messages: raw_messages || [], first_id: "first", activePath: active_path })
    setProcessedMessages(rows)
  }

  // update active path when raw_messages changes
  useEffect(() => {
    updateMessages()
  }, [JSON.stringify([raw_messages])])

  /*  
 // compute sliding window memory when messages change
 useEffect(() => {
    if (!module) return
    if (!session?.settings.module.variant) return
    if (!messages) return
    compileSlidingWindowMemory({ model: session?.settings.module.variant, messages: messages.map((m) => m[1]) })
  }, [JSON.stringify([module, session?.settings.module.variant, session_id, branch_parent_id])]) */

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

  // switch active branch
  const onBranchClick = async (msg_id: string, no_update?: boolean, msgs?: TextMessageT[]) => {
    const messages = msgs || raw_messages
    // follow activePath from active_path_branch_id to the end and mark all human messages as inactive
    function markBranchInactive(msg_id: string) {
      // find active sibling from the branch
      const msg = _.find(messages, { id: msg_id })
      if (msg?.type === "human") {
        // get all siblings
        const siblings = _.filter(messages, { parent_id: msg?.parent_id })
        // mark all siblings as inactive in messages
        siblings.forEach((sibling) => {
          sibling.active = false
          const i = _.findIndex(messages, { id: sibling.id })
          if (messages && i) messages[i] = sibling
        })
        // find all children of the siblings
        const children = _.filter(messages, (m) => _.includes(_.map(siblings, "id"), m.parent_id))
        // mark all children as inactive in messages
        children.forEach((child) => {
          markBranchInactive(child.id)
        })
      } else {
        // find all children of the message
        const children = _.filter(messages, (m) => m.parent_id === msg_id)
        // mark all children as inactive in messages
        children.forEach((child) => {
          markBranchInactive(child.id)
        })
      }
    }
    markBranchInactive(msg_id)

    // mark other messages with same parent_id as not active and the clicked one as active
    const updated_messages = _.map(messages, (message) => {
      if (message.parent_id === messages?.find((msg) => msg.id === msg_id)?.parent_id) {
        message.active = false
      }
      if (message.id === msg_id) {
        message.active = true
      }
      return message
    })
    /* 
    TODO: Make this faster to enable visual ques for what is included in the sliding window memory
    compileSlidingWindowMemory({ model: session?.settings.module.variant, messages: messages }) 
    */
    if (no_update) return updated_messages

    setRawMessages(updated_messages)
    await SessionsActions.updateMessages({ session_id, messages: updated_messages })
    fieldFocus({ selector: "#input" })
  }

  // create new branch
  const onNewBranchClick = async (parent_id: string) => {
    // mark other messages with same parent_id as not active
    let updated_raw_messages = _.cloneDeep(raw_messages || [])
    const new_branch_msg: TextMessageT = {
      _v: 1,
      id: nanoid(10),
      version: "1.0",
      type: "human",
      text: "type new message below...",
      source: "example",
      parent_id,
      signature: "",
      hash: "1337",
      active: true,
    }

    updated_raw_messages = _.map(updated_raw_messages, (message) => {
      if (message.parent_id === parent_id) {
        message.active = false
      }
      return message
    })
    updated_raw_messages.push(new_branch_msg)
    setBranchMsgId(new_branch_msg.id)
    setBranchParentId(parent_id)

    // hacky settimeout because react...
    setTimeout(() => {
      setRawMessages(updated_raw_messages)
      fieldFocus({ selector: "#input" })
    }, 200)
  }

  async function appendOrUpdateProcessedMessage({ message }: { message: TextMessageT }) {
    const ms = await MessagesState({ session_id })
    const raw_messages: TextMessageT[] = ms?.get()
    const activePath = computeActivePath(raw_messages || [])

    let processed_messages = buildMessageTree({ messages: raw_messages || [], first_id: "first", activePath })
    // find the message in processed_messages
    const msg_index = _.findIndex(processed_messages, (msg) => msg[1].id === message.id)
    let new_processed_messages = _.cloneDeep(processed_messages || [])
    if (msg_index === -1) {
      // if message is not found, append it to the end
      new_processed_messages?.push([[], message, []])
      // setProcessedMessages(new_processed_messages)
    } else {
      // if message is found, update it
      new_processed_messages[msg_index][1] = message
      // setProcessedMessages(new_processed_messages)
    }

    setProcessedMessages(new_processed_messages)
    // setProcessedMessages(rows)
  }

  function addRawMessage({ message }: { message: TextMessageT }) {
    setRawMessages([...(raw_messages || []), message])
  }
  async function send({ message }: { message: string }) {
    // Add temp message to processed messages to show it in the UI faster - will get overwritten automatically once raw_messages are updated
    if (!branch_msg_id) {
      const tmp_id = nanoid(10)
      const temp_msg = {
        _v: 1,
        id: tmp_id,
        type: "human",
        hash: "123",
        text: message,
        source: "user",
        active: true,
        parent_id: branch_parent_id || "first",
      }

      setProcessedMessages([...(processed_messages || []), [[], temp_msg as TextMessageT, []]])
      setGenInProgress(true)
    }

    const msg_ok = await addMessage({
      session,
      session_id,
      api_key,
      module,
      processed_messages: processed_messages || [],
      branch_parent_id,
      message,
      message_id: branch_msg_id || "",
      raw_messages: raw_messages || [],
      user_state,
      callbacks: {
        setGenInProgress,
        setMsgUpdateTs,
        setMsgsInMem,
        setGenController,
        setBranchParentId,
        appendOrUpdateProcessedMessage,
        addRawMessage,
      },
    })
    if (!msg_ok) {
      updateMessages()
      setInputText(message)
    }
    if (branch_msg_id) setBranchMsgId("")
    setTimeout(() => fieldFocus({ selector: "#input" }), 200)
  }

  if (!session || !module) return null
  return (
    <div className="flex flex-1 flex-col pt-2 relative" ref={eContainer}>
      <div className="flex flex-1">
        <AutoScroll showOption={false} scrollBehavior="auto" className={`flex flex-1`}>
          {processed_messages && processed_messages?.length > 0 ? (
            <div className="flex flex-grow text-xs justify-center items-center text-zinc-500 pb-4">
              Active module:
              <select
                className="flex border rounded-lg px-2 ml-2 py-1 bg-zinc-800 border-zinc-700 placeholder-zinc-400 text-white text-xs"
                value={
                  session.settings.module.variant
                    ? `{"id": "${session.settings.module.id}", "variant": "${session.settings.module.variant}"}`
                    : "click to select"
                }
                onChange={(data) => {
                  handleModuleChange({
                    value: data.target.value,
                  })
                }}
              >
                {generate_llm_module_options({
                  user_state,
                  selected: `{"id": "${session.settings.module.id}", "variant": "${session.settings.module.variant}"}`,
                })}
              </select>
            </div>
          ) : null}
          <div className="Messages flex flex-1 flex-col" style={{ height }}>
            {processed_messages && processed_messages?.length > 0 ? (
              <ConversationTree
                rows={processed_messages}
                onNewBranchClick={onNewBranchClick}
                onBranchClick={onBranchClick}
                participants={participants}
                paddingBottom={input_height + 30}
                msgs_in_mem={msgs_in_mem}
              />
            ) : api_key ? (
              <div id="BlankChat" className="flex h-full flex-col justify-center items-center">
                <img src={PromptIcon} className="w-52 h-52 mb-4 opacity-5" />
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
                    {generate_llm_module_options({ user_state })}
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
                    <kbd className="kbd kbd-xs">Shift</kbd> + <kbd className="kbd kbd-xs">Alt</kbd> +{" "}
                    <kbd className="kbd kbd-xs">D</kbd> delete session
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-full flex-col gap-2">
                {user_state?.experiences?.find((e) => e.id === "onboarding/v1") ? (
                  <>
                    <div className="text-zinc-500">
                      No API key for {module?.specs.meta.vendor?.name || module?.specs.meta.name} module
                    </div>
                    <div className="text-sm">
                      <Link to="/conductor/settings">
                        Setup {module?.specs.meta.vendor?.name || module?.specs.meta.name} module
                      </Link>
                    </div>
                  </>
                ) : (
                  <img src={PromptIcon} className="w-48 h-48 opacity-10" />
                )}
              </div>
            )}
          </div>
        </AutoScroll>
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex justify-center">
        <div id="Input" ref={eInput} className={`max-w-screen-lg w-full my-4 mx-4 ${!api_key ? "opacity-25" : ""}`}>
          <Input
            send={send}
            session_id={session_id}
            messages={processed_messages}
            gen_in_progress={gen_in_progress}
            is_new_branch={branch_parent_id}
            disabled={!api_key}
            genController={genController}
            input_text={input_text}
            setMsgUpdateTs={setMsgUpdateTs}
            session={session}
          />
        </div>
      </div>
    </div>
  )
}
