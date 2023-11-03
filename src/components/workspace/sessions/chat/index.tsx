// TODO: This component has bloated with too many responsibilities. Refactor it into smaller components using events.

// React
import { useEffect, useRef, useState } from "react"
import { useLoaderData, useNavigate } from "react-router-dom"

// Helpers
import _ from "lodash"
import { z } from "zod"
import { nanoid } from "nanoid"
import AutoScroll from "@brianmcallister/react-auto-scroll"

// Icons
import PromptIcon from "@/assets/prompt.svg"
import { FaUser } from "react-icons/fa"
import { TiDelete } from "react-icons/ti"
import { TbSelector } from "react-icons/tb"
import { KBDs } from "./kbd"

// Data
import Data from "@/components/workspace/data/data"
import { DataRefT, WorkspaceS } from "@/data/schemas/workspace"
import { initLoaders } from "@/data/loaders"
import { queryIndex } from "@/libraries/data"
import config from "@/config"

// Libraries
import { addMessage } from "./add_message"
import { autoRename } from "./auto_renamer"
import { error } from "@/libraries/logging"
import { fieldFocus } from "@/libraries/field_focus"
import { getAvatar } from "@/libraries/ai"
import { Module } from "@/modules/"
import { useEvent } from "@/components/hooks/useEvent"

// Actions
import SessionActions from "@/data/actions/sessions"
import SessionsActions from "@/data/actions/sessions"
import UserActions from "@/data/actions/user"
import { computeActivePath, onBranchClick, onNewBranchClick, buildMessageTree } from "./branching"

// Schemas
import { AIsT } from "@/data/schemas/ai"
import { ModuleS, ModuleT } from "@/data/schemas/modules"
import { UserT } from "@/data/loaders/user"
import { SessionsT, TextMessageT } from "@/data/loaders/sessions"

// Components
import ConversationTree from "@/components/workspace/sessions/chat/convotree"
import Input from "@/components/workspace/sessions/chat/input"
import { AISelector } from "./ai_selector"
import { emit, query } from "@/libraries/events"
import { ChatT, MessageRowT } from "@/data/schemas/sessions"

const padding = 50

export default function Chat({ workspace_id, session_id }: { workspace_id: string; session_id: string }) {
  const { sessions_state, user_state, MessagesState, ai_state } = useLoaderData() as {
    sessions_state: SessionsT
    user_state: UserT
    ai_state: AIsT
    MessagesState: Function
  }

  const navigate = useNavigate()

  // setup stores
  const [sid] = useState(session_id)

  const [installed_ais, setInstalledAIs] = useState<AIsT>(ai_state)

  // refresh chat if session or workspace id changes
  useEffect(() => {
    if (session_id !== sid) {
      // emit session change
      emit({ type: "sessions/change", data: { session_id } })
    }
  }, [JSON.stringify([sid, workspace_id])])

  // setup session
  const [session, setSession] = useState(sessions_state.active[sid] || null)

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

  useEvent({
    name: "chat/new-branch",
    target: session_id,
    action: ({ id, parent_id }: { id: string; parent_id: string }) => {
      setBranchMsgId(id)
      setBranchParentId(parent_id)
    },
  })

  useEvent({
    name: "chat/raw-messages",
    target: session_id,
    action: ({ messages }: { messages: TextMessageT[] }) => {
      setRawMessages(messages)
    },
  })

  useEvent({
    name: "chat/branch-click",
    target: session_id,
    action: async (data: { msg_id: string; no_update?: boolean; msgs?: TextMessageT[] }) => {
      await onBranchClick({ ...data, session_id })
      const container_e = document.querySelector(".react-auto-scroll__scroll-container") as HTMLElement
      const offset = container_e.scrollTop
      container_e?.scrollTo({ top: offset })
      fieldFocus({ selector: "#input" })
    },
  })

  useEvent({
    name: "chat/new-branch-click",
    target: session_id,
    action: ({ parent_id }: { parent_id: string }) => {
      onNewBranchClick({ parent_id, session_id })
    },
  })

  // setup data
  const [attached_data, setAttachedData] = useState<DataRefT[]>([])
  async function updateData() {
    if (!sid) return
    const session = await query<ChatT>({ type: "sessions.getById", data: { session_id: sid } })
    const data = session?.data || []
    if (data) {
      setAttachedData(data)

      // setup index
      await queryIndex({ query: "future", update: true, source: "session", session_id: sid })
    }
  }

  useEvent({ name: ["sessions.addData.done", "sessions.removeData.done"], target: session_id, action: updateData })

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
  const [module, setModule] = useState<{ specs: z.infer<typeof ModuleS>; main: Function } | undefined>(undefined)

  // change session's active module
  const handleModuleChange = async ({ value }: { value: string }) => {
    const new_llm_module = value.split("/")
    if (!new_llm_module) return error({ message: "Module not found" })
    // update session default module
    const new_session = _.cloneDeep(session)
    new_session.settings.module = { id: new_llm_module[0], variant: new_llm_module[1] }

    // update session in sessions
    const new_sessions = _.cloneDeep(sessions_state)
    new_sessions.active[sid] = new_session
    await SessionsActions.updateSessions(new_sessions)

    navigate(`/c/${workspace_id}/${sid}`)

    // set focus to #input
    setTimeout(() => {
      fieldFocus({ selector: "#input" })
    }, 200)
  }

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
    Module(session?.settings.module.id).then(async (module) => {
      if (!module && session) {
        module = await Module(config.defaults.llm_module.id)
        if (!module) return error({ message: "Default module not found" })
        // update session default module
        const new_session = _.cloneDeep(session)
        new_session.settings.module = {
          id: config.defaults.llm_module.id,
          variant: config.defaults.llm_module.variant_id || "",
        }
        await SessionActions.updateSession({ session_id: sid, session: new_session })
        navigate(`/c/${workspace_id}/${sid}`)
      }
      if (!module) return
      setModule(module)
      setTimeout(() => fieldFocus({ selector: "#input" }), 200)
    })
  }, [JSON.stringify([session?.settings.module, session])])

  // change session's active ai
  const handleAIChange = async ({ value }: { value: string }) => {
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
    new_sessions.active[sid] = new_session
    await SessionsActions.updateSessions(new_sessions)

    navigate(`/c/${workspace_id}/${sid}`)

    // set focus to #input
    setTimeout(() => {
      fieldFocus({ selector: "#input" })
    }, 200)
  }

  // Update local session state when sessions[sid] changes
  const updateSession = async () => {
    // console.log("update")
    const { AppState, SessionState, UserState, AIState } = await initLoaders()
    const user_state = await UserState.get()
    const ai_state = await AIState.get()
    const sessions_state = await SessionState.get()
    const session = sessions_state.active[sid]
    if (!session) return
    setSession(session)
    setInstalledAIs(ai_state)
    // deal with legacy sessions without AIs
    if (!session.settings.ai) {
      // add default ai
      const new_session = _.cloneDeep(session)
      new_session.settings.ai = "c1"
      setSession(new_session)
      // update session in sessions
      const new_sessions = _.cloneDeep(sessions_state)
      new_sessions.active[sid] = new_session
      await SessionsActions.updateSessions(new_sessions)
    }
    const workspace = user_state.workspaces.find((w: any) => w.id === workspace_id) as z.infer<typeof WorkspaceS>
    const ss = await MessagesState({ session_id: sid })
    const msgs: TextMessageT[] = ss?.get()
    // setSession(s.active[sid])
    setRawMessages(_.uniqBy(msgs || [], "id"))
    setMessagesStates(ss)
    updateData()
    const app_state = await AppState.get()
    let session_name = ""
    for (const group of workspace.groups) {
      for (const folder of group.folders) {
        const session = folder.sessions?.find((s) => s.id === sid)
        if (session) session_name = session.name
      }
    }
    const active_session = _.find(app_state.open_sessions, { session_id: sid })
    // updateData()
    if (_.size(msgs) >= 2 && _.size(msgs) <= 5 && session_name === "Untitled" && active_session) {
      const generated_session_name = await autoRename({ session_id: sid, messages: msgs, user_id: user_state.id })
      if (generated_session_name) {
        // update session name
        await UserActions.renameItem({
          new_name: generated_session_name,
          group_id: active_session.group_id,
          folder_id: active_session.folder_id,
          session_id: sid,
        })

        navigate(`/c/${workspace_id}/${sid}`)
      }
    }
  }

  useEvent({ name: "store_update", target: session_id, action: updateSession })

  useEffect(() => {
    updateSession()
  }, [JSON.stringify([gen_in_progress, branch_parent_id])])

  // update raw messages when msg_update_ts changes
  useEffect(() => {
    if (!messages_state) return
    const msgs: TextMessageT[] = messages_state?.get()
    setRawMessages(_.uniqBy(msgs || [], "id"))
  }, [msg_update_ts])

  // update processed messages
  async function updateMessages() {
    const active_path = computeActivePath(raw_messages || [])
    if (!active_path) return
    let rows = buildMessageTree({ messages: raw_messages || [], first_id: "first", activePath: active_path })
    emit({
      type: "chat/processed-messages",
      data: {
        target: session_id,
        messages: rows,
        module,
      },
    })
    setProcessedMessages(rows)
  }

  useEvent({
    name: "chat/processRawMessages",
    target: session_id,
    action: () => {
      console.log("processRawMessages")
      updateMessages()
    },
  })

  // update active path when raw_messages changes
  useEffect(() => {
    updateMessages()
  }, [JSON.stringify([raw_messages])])

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

  async function appendOrUpdateProcessedMessage({ message }: { message: TextMessageT }) {
    const ms = await MessagesState({ session_id: sid })
    const raw_messages: TextMessageT[] = ms?.get()
    const activePath = computeActivePath(raw_messages || [])

    let processed_messages = buildMessageTree({ messages: raw_messages || [], first_id: "first", activePath })
    // find the message in processed_messages
    const msg_index = _.findIndex(processed_messages, (msg) => msg[1].id === message.id)
    let new_processed_messages = _.cloneDeep(processed_messages || [])
    if (msg_index === -1) {
      // if message is not found, append it to the end
      new_processed_messages?.push([[], message, []])
    } else {
      // if message is found, update it
      new_processed_messages[msg_index][1] = message
    }

    setProcessedMessages(new_processed_messages)
    emit({
      type: "chat/processed-messages",
      data: {
        target: session_id,
        messages: new_processed_messages,
        module,
      },
    })
    return new_processed_messages
  }

  function addRawMessage({ message }: { message: TextMessageT }) {
    setRawMessages([...(raw_messages || []), message])
  }

  async function send({ message, meta, bid }: { message: string; meta?: TextMessageT["meta"]; bid?: string }) {
    const ai = _.find(ai_state, { id: session?.settings.ai || "c1" })
    if (!ai) return error({ message: "AI not found" })

    let active_module: any = module
    if (!active_module) {
      // get the default module
      const defaultModule = _.find(user_state.modules.installed, { id: ai.default_llm_module.id })
      if (defaultModule) {
        active_module = await Module(defaultModule.id)
      }
    }

    // Add temp message to processed messages to show it in the UI faster - will get overwritten automatically once raw_messages are updated
    let processed_messages_update = processed_messages 
    if (!branch_msg_id) {
      const tmp_id = nanoid(10)
      const temp_msg = {
        _v: 1,
        id: tmp_id,
        type: "human",
        hash: "123",
        text: message,
        meta: meta || {},
        source: `user:${user_state.id}`,
        active: true,
        parent_id: branch_parent_id || bid || "first",
      }
      const p_msgs: MessageRowT[] = [...(processed_messages || []), [[], temp_msg as TextMessageT, []]]
      setProcessedMessages(p_msgs)
      emit({
        type: "chat/processed-messages",
        data: {
          target: session_id,
          messages: p_msgs,
          module,
        },
      })
      setGenInProgress(true)
    }

    // get the 5 last messages
    let latest_messages: string[] = []
    if (processed_messages_update && processed_messages_update.length > 0) {
      latest_messages = _(processed_messages_update)
        .filter((p) => p[1].type === "human")
        ?.slice(-5)
        .map((m) => m[1].text)
        .value()
    }
    const context = await queryIndex({
      query: [...latest_messages, message].join("\n"),
      source: "session",
      session_id: sid,
      result_count: 5,
    })

    const msg_ok = await addMessage({
      session,
      session_id: sid,
      module: active_module,
      context,
      processed_messages: processed_messages_update || [],
      branch_parent_id: branch_parent_id || bid || "first",
      message,
      meta,
      message_id: branch_msg_id || "",
      raw_messages: raw_messages || [],
      user_state,
      ai,
      callbacks: {
        setGenInProgress,
        setMsgUpdateTs,
        setMsgsInMem,
        setGenController,
        setBranchParentId,
        appendOrUpdateProcessedMessage,
        addRawMessage,
        onError: async () => {
          await updateMessages()
          navigate(`/c/${workspace_id}/${sid}`)
        },
      },
    })
    if (!msg_ok) {
      updateMessages()
      setInputText(message)
    }
    if (branch_msg_id) setBranchMsgId("")
    setTimeout(() => fieldFocus({ selector: "#input" }), 200)
  }

  useEvent({
    name: "sessions.addMessage",
    target: session_id,
    action: ({
      session_id,
      message,
      meta,
      bid,
    }: {
      session_id: string
      message: string
      meta: TextMessageT["meta"]
      bid: string
    }) => {
      if (session_id !== sid) return
      send({ message, meta, bid })
    },
  })

  const AISelectorButton = (
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
            {_.find(installed_ais, { id: session?.settings?.ai })?.persona.name}
          </div>
          <div className="flex flex-col">
            <TbSelector className="" />
          </div>
        </div>
      </div>
    </label>
  )

  if (!session || !module) return null
  return (
    <div className="flex flex-1 flex-col relative" ref={eContainer}>
      <div className="flex flex-1">
        <AutoScroll showOption={false} scrollBehavior="auto" className={`flex flex-1`}>
          {processed_messages && processed_messages?.length > 0 ? (
            <div className="flex flex-grow text-xs justify-center items-center text-zinc-500 pb-4 pt-2">
              <div className="dropdown">
                {AISelectorButton}

                <div
                  tabIndex={0}
                  className="dropdown-content z-[1] card card-compact shadow bg-primary text-primary-content md:-left-[25%]"
                >
                  <AISelector
                    installed_ais={installed_ais}
                    session={session}
                    user_state={user_state}
                    handleAIChange={handleAIChange}
                    handleModuleChange={handleModuleChange}
                  />
                </div>
              </div>
            </div>
          ) : null}
          <div className="Messages flex flex-1 flex-col" style={{ height }}>
            {processed_messages && processed_messages?.length > 0 ? (
              <ConversationTree
                session_id={sid}
                rows={processed_messages}
                paddingBottom={input_height + 30}
                msgs_in_mem={msgs_in_mem}
                gen_in_progress={gen_in_progress}
                ai={_.find(ai_state, { id: session.settings.ai }) as AIsT[0]}
              />
            ) : (
              <div id="BlankChat" className="flex h-full flex-col justify-center items-center">
                <img src={PromptIcon} className="w-52 h-52 mb-4 opacity-5" />
                <div className="flex text-zinc-500 font-semibold text-sm pb-2">Select AI to chat with...</div>
                <div className="flex">
                  <div className="dropdown">
                    {AISelectorButton}

                    <div
                      tabIndex={0}
                      className="dropdown-content z-[1] card card-compact shadow bg-primary text-primary-content md:-left-[25%]"
                    >
                      <AISelector
                        installed_ais={installed_ais}
                        session={session}
                        user_state={user_state}
                        handleAIChange={handleAIChange}
                        handleModuleChange={handleModuleChange}
                      />
                    </div>
                  </div>
                </div>
                <KBDs />
              </div>
            )}
          </div>
        </AutoScroll>
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex justify-center">
        <div className={`max-w-screen-lg w-full my-4 mx-4`} ref={eInput}>
          <div className="flex flex-row gap-2 pb-1">
            {attached_data?.map((d, i) => {
              return (
                <div key={i} className="min-w-[60px] max-w-[500px] flex-nowrap bg-zinc-800 rounded">
                  <Data
                    {...d}
                    removeIcon={<TiDelete />}
                    onRemove={() => {
                      emit({
                        type: "sessions.removeData",
                        data: {
                          target: session_id,
                          session_id: sid,
                          data_id: d.id,
                        },
                      })
                      /* SessionActions.removeData({
                        session_id: sid,
                        data_id: d.id,
                      }) */
                    }}
                  ></Data>
                </div>
              )
            })}
          </div>
          <div id="Input" className={``}>
            <Input
              send={send}
              session_id={sid}
              messages={processed_messages}
              gen_in_progress={gen_in_progress}
              is_new_branch={branch_parent_id}
              genController={genController}
              input_text={input_text}
              setMsgUpdateTs={setMsgUpdateTs}
              session={session}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
