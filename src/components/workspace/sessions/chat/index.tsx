// TODO: This component has bloated with too many responsibilities. Refactor it into smaller components using events.

// React
import { useEffect, useRef, useState } from "react"
import { useLoaderData, useNavigate, useParams } from "react-router-dom"

// Helpers
import _ from "lodash"
import { z } from "zod"
import { nanoid } from "nanoid"
import AutoScroll from "@brianmcallister/react-auto-scroll"

// Icons
import PromptIcon from "@/assets/prompt.svg"
import { TiDelete } from "react-icons/ti"
import { KBDs } from "./kbd"

// Data
import Data from "@/components/workspace/data/data"
import { WorkspaceS } from "@/data/schemas/workspace"
import { initLoaders } from "@/data/loaders"
import { queryIndex } from "@/libraries/data"
import config from "@/config"

// Libraries
import { addMessage } from "../messages/add_message"
import { autoRename } from "../../../../modules/auto_renamer"
import { error } from "@/libraries/logging"
import { fieldFocus } from "@/libraries/field_focus"
import { Module } from "@/modules/"
import { useEvent } from "@/components/hooks/useEvent"

// Actions
import SessionActions from "@/data/actions/sessions"
import SessionsActions from "@/data/actions/sessions"
import UserActions from "@/data/actions/user"
import {
  computeActivePath,
  onBranchClick,
  onNewBranchClick,
  buildMessageTree,
} from "../../../../libraries/branching"

// Schemas
import { AIsT } from "@/data/schemas/ai"
import { UserT } from "@/data/loaders/user"
import { SessionsT, TextMessageT } from "@/data/loaders/sessions"

// Components
import ConversationTree from "@/components/workspace/sessions/chat/convotree"
import Input from "@/components/workspace/sessions/chat/input"
import { AISelector, AISelectorButton } from "./ai_selector"
import { emit, query } from "@/libraries/events"
import { ChatSessionT, MessageRowT } from "@/data/schemas/sessions"
import useMemory from "@/components/hooks/useMemory"
import { Match, Switch } from "react-solid-flow"
import {
  createFullContext,
  tokenizeInput,
  tokenizeMessages,
} from "@/libraries/ai"
import { mChatSessionT } from "@/data/schemas/memory"

const padding = 50

export default function Chat({
  workspace_id,
  session_id,
}: {
  workspace_id: string
  session_id: string
}) {
  const { sessions_state, user_state, MessagesState, ai_state } =
    useLoaderData() as {
      sessions_state: SessionsT
      user_state: UserT
      ai_state: AIsT
      MessagesState: Function
    }
  const stores_mem = useMemory<{
    [key: string]: Partial<{
      status: "ready" | "initializing" | "error" | "syncing"
    }>
  }>({
    id: "stores",
  })

  const mem_session = useMemory<mChatSessionT>({
    id: `session-${session_id}`,
  })
  if (!mem_session) return
  const { module, session, messages, generation } = mem_session
  console.log(session_id, mem_session)
  if (!session || !messages || !generation) return

  const {
    raw: raw_messages,
    active: processed_messages,
    branch_msg_id,
    branch_parent_id,
  } = messages

  const {
    in_progress: gen_in_progress,
    msgs_in_mem,
    msg_update_ts,
  } = generation

  const navigate = useNavigate()

  // setup stores
  const [sid] = useState(session_id)

  const [installed_ais, setInstalledAIs] = useState<AIsT>(ai_state)

  const [input_text, setInputText] = useState<string>("")

  // setup various layout related states
  const eInput = useRef<HTMLDivElement | null>(null)
  const eContainer = useRef<HTMLDivElement | null>(null)
  const [input_height, setInputHeight] = useState<number>(
    eInput?.current?.offsetHeight || 0,
  )
  const [container_height, setContainerHeight] = useState<number>(
    eContainer?.current?.offsetHeight ?
      eContainer?.current?.offsetHeight - 80
    : 0,
  )
  const [height, setHeight] = useState(
    window.innerHeight -
      ((document.getElementById("Tabs")?.clientHeight || 55) +
        (document.getElementById("Input")?.clientHeight || 55)) -
      padding +
      "px",
  )

  async function appendOrUpdateProcessedMessage({
    message,
  }: {
    message: TextMessageT
  }) {
    const ms = await MessagesState({ session_id: sid })
    const raw_messages: TextMessageT[] = ms?.get()
    const activePath = computeActivePath(raw_messages || [])

    let processed_messages = buildMessageTree({
      messages: raw_messages || [],
      first_id: "first",
      activePath,
    })
    // find the message in processed_messages
    const msg_index = _.findIndex(
      processed_messages,
      (msg) => msg[1].id === message.id,
    )
    let new_processed_messages = _.cloneDeep(processed_messages || [])
    if (msg_index === -1) {
      // if message is not found, append it to the end
      new_processed_messages?.push([[], message, []])
    } else {
      // if message is found, update it
      new_processed_messages[msg_index][1] = message
    }

    // setProcessedMessages(new_processed_messages)
    mem_session.messages.active = new_processed_messages
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
    mem_session.messages.raw = [...(raw_messages || []), message]
  }

  async function send({
    message,
    meta,
  }: {
    message: string
    meta?: TextMessageT["meta"]
  }) {
    const ai = _.find(ai_state, { id: _.get(session, "settings.ai") || "c1" })
    if (!ai) return error({ message: "AI not found" })

    const ss = await MessagesState({ session_id: sid })
    const msgs: TextMessageT[] = ss?.get()

    const raw_msgs = _.uniqBy(msgs || [], "id")

    // Add temp message to processed messages to show it in the UI faster - will get overwritten automatically once raw_messages are updated
    let processed_messages_update = await updateMessages({ raw_msgs })
    if (!branch_msg_id && meta?.role !== "continue") {
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
        parent_id: branch_parent_id,
      }
      const p_msgs: MessageRowT[] = [
        ...(processed_messages_update || []),
        [[], temp_msg as TextMessageT, []],
      ]

      mem_session.messages.active = p_msgs
      emit({
        type: "chat/processed-messages",
        data: {
          target: session_id,
          messages: p_msgs,
          module,
        },
      })

      mem_session.generation.in_progress = true
    }

    const msg_ok = await addMessage({
      session_id: sid,
      processed_messages: processed_messages_update || [],
      branch_parent_id: branch_parent_id,
      message,
      meta,
      message_id: branch_msg_id || "",
      raw_messages: raw_messages || [],
      user_state,
      ai,
      callbacks: {
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
    if (branch_msg_id) mem_session.messages.branch_msg_id = ""
    setTimeout(() => fieldFocus({ selector: "#input" }), 200)
  }

  async function computeMessageTokens({ text }: { text: string }) {
    const msgs = mem_session.messages.active?.map((m) => m[1]) || []
    const msg_toks = await tokenizeMessages({
      messages: [
        ...msgs,
        {
          _v: 1,
          id: "tmp",
          type: "human",
          hash: "123",
          text: text,
          source: `user:${user_state.id}`,
          active: true,
          parent_id: "test",
          version: "1.0",
          created_at: new Date().toISOString(),
          status: "ready",
        },
      ],
      model: mem_session.session.settings.module.variant,
    })
    if (msg_toks) {
      mem_session.messages.tokens = msg_toks.usedTokens
      emit({
        type: "sessions/tokensUpdate",
        data: {
          target: session_id,
          tokens: msg_toks.usedTokens,
        },
      })
    }
  }

  async function computeAssociatedDataTokens() {
    const full_context = await createFullContext({ session_id: sid })
    if (full_context) {
      const toks = await tokenizeInput({
        input: full_context,
        model: mem_session.session.settings.module.variant,
      })
      if (toks) {
        mem_session.context.tokens = toks.usedTokens
      }
    } else {
      mem_session.context.tokens = 0
    }
    emit({
      type: "sessions/tokensUpdate",
      data: {
        target: session_id,
      },
    })
  }

  async function updateData() {
    // if (!session) return
    const session = await query<ChatSessionT>({
      type: "sessions.getById",
      data: { session_id: sid },
    })
    if (!session) return
    mem_session.session = session
    const data = session?.data || []
    if (data) {
      // check if data has changed copared to data_refs
      if (
        data.length === 0 ||
        !_.isEqual(data, mem_session.context.data_refs)
      ) {
        mem_session.context.data_refs = data
        computeAssociatedDataTokens()
      }
      // setup index
      await queryIndex({
        query: "future",
        update: true,
        source: "session",
        session_id: sid,
      })
    }
  }

  // Update local session state when sessions[sid] changes
  const updateSession = async () => {
    const { AppState, SessionState, UserState, AIState } = await initLoaders()
    const user_state = await UserState.get()
    const ai_state = await AIState.get()
    const sessions_state = await SessionState.get()
    const session = sessions_state.active[sid]
    if (!session) return

    mem_session.session = session
    setInstalledAIs(ai_state)
    // deal with legacy sessions without AIs
    if (!session.settings.ai) {
      // add default ai
      const new_session = _.cloneDeep(session)
      new_session.settings.ai = "c1"

      mem_session.session = new_session
      // update session in sessions
      const new_sessions = _.cloneDeep(sessions_state)
      new_sessions.active[sid] = new_session
      await SessionsActions.updateSessions(new_sessions)
    }
    const workspace = user_state.workspaces.find(
      (w: any) => w.id === workspace_id,
    ) as z.infer<typeof WorkspaceS>

    const msgs = await query<TextMessageT[]>({
      type: "sessions.getMessages",
      data: { session_id: sid },
    })
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
    if (
      mem_session.messages.tokens === 0 &&
      mem_session.messages.active.length > 0
    )
      computeMessageTokens({ text: input_text })
    if (
      mem_session.context.tokens === 0 &&
      mem_session.context.data_refs.length > 0
    )
      computeAssociatedDataTokens()

    if (
      _.size(msgs) >= 2 &&
      _.size(msgs) <= 5 &&
      session_name === "Untitled" &&
      active_session
    ) {
      const generated_session_name = await autoRename({
        session_id: sid,
        messages: msgs,
        user_id: user_state.id,
      })
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

  // update processed messages
  async function updateMessages({
    raw_msgs,
  }: { raw_msgs?: TextMessageT[] } = {}) {
    const active_path = computeActivePath(raw_msgs || raw_messages || [])
    if (!active_path) return
    let rows = buildMessageTree({
      messages: raw_msgs || raw_messages || [],
      first_id: "first",
      activePath: active_path,
    })
    emit({
      type: "chat/processed-messages",
      data: {
        target: session_id,
        messages: rows,
        module,
      },
    })

    if (rows) mem_session.messages.active = rows
    return rows
  }

  async function updateModule({ module_id }: { module_id?: string } = {}) {
    if (!module_id) module_id = _.get(session, "settings.module.id")
    if (!session || !module_id) return
    const module = await Module(module_id)
    if (!module && !config.defaults.llm_module.id) {
      const default_module = await Module(config.defaults.llm_module.id)
      if (!default_module) return error({ message: "Default module not found" })
      // update session default module
      const new_session = _.cloneDeep(session)
      if (!_.get(new_session, "settings.module"))
        _.set(new_session, "settings.module", {
          id: config.defaults.llm_module.id,
          variant: config.defaults.llm_module.variant_id || "",
        })

      mem_session.session.settings.module = {
        id: config.defaults.llm_module.id,
        variant: config.defaults.llm_module.variant_id || "",
      }
      await SessionActions.updateSession({
        session_id: sid,
        session: new_session,
      })
      emit({
        type: "sessions/module-change",
        data: {
          target: session_id,
        },
      })
    }
    if (!module) return

    mem_session.module = module
    setTimeout(() => fieldFocus({ selector: "#input" }), 200)
  }

  // Function to handle the window resize event
  const handleResize = () => {
    setHeight(
      window.innerHeight -
        ((document.getElementById("Tabs")?.clientHeight || 55) +
          (document.getElementById("Input")?.clientHeight || 55)) -
        padding +
        "px",
    )
  }

  // refresh chat if session or workspace id changes
  useEffect(() => {
    if (session_id !== sid) {
      // emit session change
      emit({ type: "sessions/change", data: { session_id } })
    }
  }, [JSON.stringify([sid, workspace_id])])

  // keep track of input height
  useEffect(() => {
    const e_input = eInput.current
    if (!e_input) return
    const input_observer = new ResizeObserver(() => {
      setInputHeight(e_input.offsetHeight)
    })
    setInputHeight(e_input.offsetHeight)
    input_observer.observe(e_input)

    const e_container = eContainer.current
    if (!e_container) return
    const container_observer = new ResizeObserver(() => {
      setContainerHeight(e_container.offsetHeight)
    })
    setContainerHeight(e_container.offsetHeight)
    container_observer.observe(e_container)
  }, [eInput?.current?.offsetHeight])

  // set module
  useEffect(() => {
    updateModule()
  }, [JSON.stringify([_.get(session, "settings.module") || {}, session])])

  useEffect(() => {
    updateSession()
  }, [JSON.stringify([gen_in_progress, branch_parent_id])])

  // update raw messages when msg_update_ts changes
  useEffect(() => {
    query<TextMessageT[]>({
      type: "sessions.getMessages",
      data: { session_id: sid },
    }).then((msgs) => {
      mem_session.messages.raw = msgs
    })
  }, [msg_update_ts])

  // update active path when raw_messages changes
  useEffect(() => {
    updateMessages()
  }, [JSON.stringify([raw_messages])])

  // useEffect to add and remove the event listener
  useEffect(() => {
    window.addEventListener("resize", handleResize)

    // Cleanup function to remove the event listener when the component unmounts
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  useEvent({
    name: "sessions/module-change",
    target: session_id,
    async action({
      module_id,
      variant_id,
    }: {
      module_id: string
      variant_id: string
    }) {
      await updateModule({ module_id })
      computeMessageTokens({ text: input_text })
      computeAssociatedDataTokens()
    },
  })

  useEvent({
    name: "module/abort",
    target: session_id,
    action() {
      mem_session.generation.in_progress = false
      mem_session.generation.controller = undefined
      mem_session.generation.msg_update_ts = new Date().getTime()
    },
  })

  useEvent({
    name: "chat/new-branch",
    target: session_id,
    action: ({ id, parent_id }: { id: string; parent_id: string }) => {
      mem_session.messages.branch_msg_id = id
      mem_session.messages.branch_parent_id = parent_id
    },
  })

  useEvent({
    name: "chat/raw-messages",
    target: session_id,
    action: ({ messages }: { messages: TextMessageT[] }) => {
      mem_session.messages.raw = messages
    },
  })

  useEvent({
    name: "chat/branch-click",
    target: session_id,
    action: async (data: {
      msg_id: string
      no_update?: boolean
      msgs?: TextMessageT[]
    }) => {
      const container_e = document.querySelector(
        ".react-auto-scroll__scroll-container",
      ) as HTMLElement | null
      const offset = container_e?.scrollTop || 0
      await onBranchClick({ ...data, session_id })
      if (container_e) {
        container_e?.scrollTo({ top: offset })
      }
    },
  })

  useEvent({
    name: "chat/new-branch-click",
    target: session_id,
    action: ({ parent_id }: { parent_id: string }) => {
      onNewBranchClick({ parent_id, session_id })
    },
  })

  useEvent({
    name: [
      "sessions.addData.done",
      "sessions.removeData.done",
      "sessions/change",
    ],
    target: session_id,
    action: updateData,
  })

  useEvent({
    name: [
      "sessions/change",
      "sessions.updateSession.done",
      "chat/processRawMessages",
      "sessions.clearMessages.done",
      "sessions.deleteMessage.done",
    ],
    target: session_id,
    action: () => updateSession(),
  })

  useEvent({
    name: "store/update",
    target: session_id,
    action: ({ session }: { session: any }) => {
      console.log("store/update", session)
      // if (name === session_id) {
      updateMessages({ raw_msgs: session })
      // }
    },
  })

  useEvent({
    name: "chat.send",
    target: session_id,
    action: ({
      session_id,
      message,
      meta,
    }: {
      session_id: string
      message: string
      meta: TextMessageT["meta"]
    }) => {
      if (session_id !== sid) return
      send({ message, meta })
    },
  })

  useEvent({
    name: "sessions/updateInputText",
    target: session_id,
    action: ({ text }: { text: string }) => {
      clearTimeout(mem_session.input.change_timer)
      mem_session.input.change_timer = setTimeout(async () => {
        // compute tokens for input
        computeMessageTokens({ text })
      }, 1000)
    },
  })

  useEvent({
    name: "chat/processed-messages",
    target: session_id,
    action: async ({ messages }: { messages: MessageRowT[] }) => {
      if (!messages || messages?.length === 0) return
      const toks = await tokenizeMessages({
        messages: messages.map((m) => m[1]),
        model: mem_session.session.settings.module.variant,
      })
      if (toks) {
        mem_session.messages.tokens = toks.usedTokens
      }
    },
  })

  // if (session_id !== (useParams().session_id as string)) return null
  if (!session || !module) return null
  return (
    <Switch fallback={<div>Syncing</div>}>
      <Match
        when={
          stores_mem[sid]?.status === "ready" ||
          stores_mem[sid]?.status === "syncing"
        }
      >
        <div className="flex flex-1 flex-col relative" ref={eContainer}>
          <div className="flex flex-1">
            <AutoScroll
              showOption={false}
              scrollBehavior="auto"
              className={`flex flex-1`}
            >
              {processed_messages && processed_messages?.length > 0 ?
                <div className="flex flex-grow text-xs justify-center items-center text-zinc-500 pb-4 pt-2">
                  <div className="dropdown">
                    <AISelectorButton session_id={session_id} />

                    <div
                      tabIndex={0}
                      className="dropdown-content z-[1] card card-compact shadow bg-primary text-primary-content md:-left-[25%]"
                    >
                      <AISelector
                        installed_ais={installed_ais}
                        session_id={session_id}
                        user_state={user_state}
                      />
                    </div>
                  </div>
                </div>
              : null}
              <div className="Messages flex flex-1 flex-col" style={{ height }}>
                {processed_messages && processed_messages?.length > 0 ?
                  <ConversationTree
                    session_id={sid}
                    rows={processed_messages}
                    paddingBottom={input_height + 30}
                    msgs_in_mem={msgs_in_mem}
                    gen_in_progress={gen_in_progress}
                    ai={
                      _.find(ai_state, {
                        id: _.get(session, "settings.ai") || null,
                      }) as AIsT[0]
                    }
                  />
                : <div
                    id="BlankChat"
                    className="flex h-full flex-col justify-center items-center"
                  >
                    <img
                      src={PromptIcon}
                      className="w-52 h-52 mb-4 opacity-5"
                    />
                    <div className="flex text-zinc-500 font-semibold text-sm pb-2">
                      Select AI to chat with...
                    </div>
                    <div className="flex">
                      <div className="dropdown">
                        <AISelectorButton session_id={session_id} />

                        <div
                          tabIndex={0}
                          className="dropdown-content z-[1] card card-compact shadow bg-primary text-primary-content md:-left-[25%]"
                        >
                          <AISelector
                            installed_ais={installed_ais}
                            session_id={session_id}
                            user_state={user_state}
                          />
                        </div>
                      </div>
                    </div>
                    <KBDs />
                  </div>
                }
              </div>
            </AutoScroll>
          </div>
          <div className="absolute bottom-0 left-0 right-0 flex justify-center">
            <div className={`max-w-screen-lg w-full my-4 mx-4`} ref={eInput}>
              <div className="flex flex-row gap-2 pb-1">
                {mem_session.session?.data?.map((d, i) => {
                  return (
                    <div
                      key={i}
                      className="min-w-[60px] max-w-[500px] flex-nowrap bg-zinc-800 rounded"
                    >
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
                  input_text={input_text}
                  session={session}
                />
              </div>
            </div>
          </div>
          {stores_mem[session_id]?.status === "syncing" && (
            <div className="absolute top-0 left-0 right-0 z-100 flex justify-center text-xs text-zinc-500 font-semibold py-2 items-center bg-zinc-900">
              Syncing{" "}
              <div className="flex justify-center items-center" role="status">
                <svg
                  aria-hidden="true"
                  className="inline w-3 h-3 ml-1 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                  viewBox="0 0 100 101"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                    fill="currentColor"
                  />
                  <path
                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                    fill="currentFill"
                  />
                </svg>
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          )}
        </div>
      </Match>
    </Switch>
  )
}
