import { TextMessageT } from "@/data/loaders/sessions"
import SessionsActions from "@/data/actions/sessions"
import _ from "lodash"
import { compileSlidingWindowMemory } from "@/libraries/ai"
import { error } from "@/libraries/logging"
import { UserT } from "@/data/loaders/user"
import { MessageRowT } from "@/data/schemas/sessions"
import { nanoid } from "nanoid"
import { AIT } from "@/data/schemas/ai"
import { AIToInstruction } from "@/libraries/ai"
import { ReceiptT } from "@/data/schemas/sessions"
import { emit, query } from "@/libraries/events"
import { Module } from "@/modules"
import { initLoaders } from "@/data/loaders"
import { getMemoryState } from "@/libraries/memory"
import { mChatSessionT, mModulesT } from "@/data/schemas/memory"
import config from "@/config"

async function getParentId({
  branch_parent_id,
  raw_messages,
  processed_messages,
  meta,
}: {
  branch_parent_id: string
  raw_messages: TextMessageT[]
  processed_messages?: MessageRowT[]
  meta: TextMessageT["meta"]
}) {
  let resend = false
  // if no activePath, use first as parent id
  let parent_id = "first"
  // if activePath exists, set parent id as the last message id in the chain
  if (processed_messages && processed_messages.length > 0)
    parent_id = processed_messages[processed_messages.length - 1][1].id
  // unless branch parent id is set, then message should use that
  if (branch_parent_id) parent_id = branch_parent_id as string

  // sanity check, get parent message
  if (parent_id !== "first") {
    const parent_msg = raw_messages?.find((msg: any) => msg.id === parent_id)
    if (parent_msg?.type === "human" || meta?.role === "continue") {
      // console.log("resending")
      resend = true
      return { parent_id, resend }
    } else if (!parent_msg && _.size(raw_messages) > 0) {
      // console.log("no parent")
      return { parent_id: null, resend }
    } else return { parent_id, resend }
  } else return { parent_id, resend }
}

async function appendOrUpdateProcessedMessage({
  message,
  session_id,
}: {
  message: TextMessageT
  session_id: string
}) {
  const mem_session = getMemoryState<mChatSessionT>({
    id: `session-${session_id}`,
  })
  if (!mem_session) return error({ message: "no session" })
  // find the message in processed_messages
  const msg_index = _.findIndex(
    mem_session.messages.active,
    (msg) => msg[1].id === message.id,
  )
  let new_processed_messages = _.cloneDeep(mem_session.messages.active || [])
  if (msg_index === -1) {
    // if message is not found, append it to the end
    new_processed_messages?.push([[], message, []])
  } else {
    // if message is found, update it
    new_processed_messages[msg_index][1] = message
  }

  // setProcessedMessages(new_processed_messages)
  mem_session.messages.active = new_processed_messages
  // emit({
  //   type: "chat/processed-messages",
  //   data: {
  //     target: session_id,
  //     messages: new_processed_messages,
  //     module,
  //   },
  // })
  return new_processed_messages
}

export async function addMessage({
  session_id,
  // context,
  processed_messages,
  branch_parent_id,
  message,
  meta,
  message_id,
  parent_id,
  raw_messages,
  user_state,
  ai,
  callbacks: {
    // addRawMessage,
    onError,
  },
}: {
  session_id: string
  context?: { pageContent: string; metadata: { id: string; name: string } }[]
  processed_messages: MessageRowT[]
  branch_parent_id: string | boolean
  message: string
  parent_id?: string
  meta: TextMessageT["meta"]
  message_id?: string
  raw_messages: TextMessageT[]
  user_state: UserT
  ai: AIT
  callbacks: {
    // addRawMessage: Function
    onError?: Function
  }
}): Promise<boolean | undefined> {
  const mem_modules = getMemoryState<mModulesT>({ id: "modules" })
  if (!mem_modules) return error({ message: "no modules" })

  const mem_session = getMemoryState<mChatSessionT>({
    id: `session-${session_id}`,
  })
  if (!mem_session) return error({ message: "no session" })

  const { session } = mem_session
  const module_id = _.get(session, "settings.module.id")
  let active_module = await Module(module_id)

  const defaultModule = _.find(user_state.modules.installed, {
    id: ai.default_llm_module.id,
  })
  if (typeof active_module !== "object" && defaultModule) {
    active_module = await Module(defaultModule.id)
  }
  if (!active_module) throw new Error("No module")
  const module = active_module

  emit({
    type: "user.updateAILastUsed",
    data: {
      ai_id: ai.id,
    },
  })

  // get the variant
  const variant = _.find(module?.specs.meta.variants, {
    id: session?.settings.module.variant,
  })
  if (!variant)
    return error({
      message: "no variant",
      data: { module_id: module.specs.id },
    })
  if (!variant.context_len)
    return error({
      message: "no context length",
      data: { module_id: module.specs.id },
    })

  const { parent_id: pid, resend } = await getParentId({
    raw_messages,
    processed_messages,
    meta,
    branch_parent_id:
      typeof branch_parent_id === "string" ? branch_parent_id : "",
  })
  if (!parent_id) parent_id = pid as string
  if (!parent_id) {
    return error({
      message: "no parent message",
      data: { raw_messages, message },
    })
  }

  if (message || resend) {
    // let's start the failsafe timer
    let failsafe_timer = setTimeout(async () => {
      emit({
        type: "generation/abort",
        data: {
          target: session_id,
          reason: "timeout",
        },
      })
      await reset()
      error({ message: "timeout", data: { module_id: module.specs.id } })
      throw new Error("timeout")
    }, config.defaults.llm_module.timeout)

    // this is up here so we can clear it in reset
    let gen_failsafe_timer: any = null

    // reset everything
    async function reset() {
      if (failsafe_timer) clearTimeout(failsafe_timer)
      if (gen_failsafe_timer) clearTimeout(gen_failsafe_timer)
      if (mem_session) {
        mem_session.generation.in_progress = false
        mem_session.generation.msg_update_ts = new Date().getTime()
      }
    }

    let m: TextMessageT | undefined = undefined

    // compile memory
    const memory = await compileSlidingWindowMemory({
      rag_mode: mem_session.session?.settings?.memory?.rag_mode || "similarity",
      model: variant.id,
      session_id,
      prompt: {
        instructions: AIToInstruction({ ai }) || "you are a helpful assistant",
        user: message,
      },
      messages: _.map(processed_messages, (m) => m[1]).filter(
        (m) => m.hash !== "1337",
      ), // 1337 is the hash for temporary messages - TODO: use meta.role for this
    })

    // if memory is null, then we have no messages to send
    if (!memory) {
      emit({
        type: "generation/abort",
        data: {
          target: session_id,
          reason: "no messages to send",
        },
      })
      await reset()
      return false
    }

    // if memory is too long, then we need to abort
    if ((memory?.token_count || 0) > (variant?.context_len || 2000)) {
      emit({
        type: "generation/abort",
        data: {
          target: session_id,
        },
      })
      emit({
        type: "generation/out_of_context",
        data: {
          target: session_id,
          tokens_required: memory?.token_count || 0,
          current_context: variant?.context_len || 2000,
        },
      })

      await reset()
      return error({
        message: `Message (~${_.round(
          (memory?.token_count || 0) * 0.8,
          0,
        )} words) too long for ${variant.name} (${_.round(
          (variant?.context_len || 2000) * 0.8,
          0,
        )} words). Try model with longer context.`,
        data: { module_id: module.specs.id },
      })
    }

    // @ts-ignore
    if (resend) m = _.last(processed_messages)?.[1]
    else {
      // add the user message to the session's messages
      const msg: { session_id: string; message: TextMessageT } = {
        session_id,
        message: {
          _v: 1,
          id: message_id || nanoid(10),
          type: "human",
          hash: "123",
          text: message,
          meta: meta || { role: "msg" },
          // context: memory.ctx,
          context_refs: memory.included_data_refs || [],
          source: `user:${user_state.id}`,
          active: true,
          parent_id,
        } as TextMessageT,
      }
      // m = await SessionsActions.addMessage(msg)
      // if (m) mem_session.messages.raw.push(msg.message)
      m = msg.message
      mem_session.messages.raw.push(m)
      // addRawMessage({ message: m })
    }

    mem_session.generation.in_progress = true

    if (m) {
      const source = `ai:${module?.specs?.id}/${session?.settings.module.variant}/${ai?.id}`
      let stream_response = ""
      function onData({ data }: { data: any }) {
        if (failsafe_timer) clearTimeout(failsafe_timer)
        if (gen_failsafe_timer) clearTimeout(gen_failsafe_timer)
        if (data) {
          stream_response += data

          appendOrUpdateProcessedMessage({
            message: {
              _v: 1,
              id: "temp",
              version: "1.0",
              type: "ai",
              hash: "123",
              text: stream_response,
              source,
              parent_id: m?.id || "",
              created_at: new Date().toISOString(),
              status: "pending",
            },
            session_id,
          })

          if (mem_session)
            mem_session.generation.msg_update_ts = new Date().getTime()
        }
        gen_failsafe_timer = setTimeout(() => {
          emit({
            type: "generation/abort",
            data: {
              target: session_id,
              reason: "timeout",
            },
          })
          reset()
          error({ message: "timeout", data: { module_id: module.specs.id } })
          throw new Error("timeout")
        }, config.defaults.llm_module.timeout)
      }
      let has_error = false

      if (mem_session)
        mem_session.generation.msgs_in_mem = memory ? memory.included_ids : []

      const settings =
        _.find(user_state.modules.installed, {
          id: session?.settings.module.id,
        })?.meta.variants?.find(
          (v) => v.id === session?.settings.module.variant,
        )?.settings || {}
      _.merge(settings, mem_session.session?.settings?.module?.settings || {})
      const { receipt } = (await module?.main(
        {
          model: session?.settings.module.variant,
          user_id: user_state.id,
          settings: {
            ...settings,
            max_tokens: _.round(
              (variant.context_len - memory.token_count) * 0.9,
            ),
          },
          prompt: { ...memory.prompt, context: memory.ctx },
          history: memory?.history || [],
        },
        {
          setGenController: (controller: AbortController) => {
            mem_session.generation.controller = controller
          },
          onData,
          onClose: () => {},
          onError: async (data: any) => {
            emit({
              type: "generation/abort",
              data: {
                target: session_id,
              },
            })
            has_error = true
            await reset()
            if (data?.message === "Insufficient funds") {
              return emit({ type: "insufficient_funds" })
            } else {
              if (!data.surpress)
                error({
                  message: JSON.stringify(data.message) || data.code,
                  data,
                })
            }
            onError && onError(data)
          },
        },
      )) as { receipt: ReceiptT }

      if (stream_response && !has_error) {
        await reset()

        if (mem_session) mem_session.messages.branch_parent_id = false

        if (!receipt)
          return error({
            message: "error in computing costs",
            data: { model: session.settings.module.variant },
          })
        console.log(
          `Input: ${receipt.details.input.tokens} tokens, $${receipt.details.input.cost_usd} : Output: ${receipt.details.output.tokens} tokens, $${receipt.details.output.cost_usd} : Total: $${receipt.cost_usd}`,
        )
        SessionsActions.addCost({
          session_id,
          receipt,
        })

        const data: { session_id: string; message: TextMessageT } = {
          session_id,
          message: {
            _v: 1,
            id: nanoid(10),
            type: "ai",
            hash: "123",
            text: stream_response,
            meta: meta || { role: "msg" },
            context: memory.ctx,
            source,
            parent_id: m.id || "",
            created_at: new Date().toISOString(),
            status: "ready",
          } as TextMessageT
        }
        await SessionsActions.addMessage(data)
        mem_session.messages.raw.push(m)
        //if (m) mem_session.messages.raw.push(m)
        // addRawMessage({ message: m })
        // await query({
        //   type: "sessions.updateMessages",
        //   data: {
        //     session_id,
        //     messages: mem_session.messages.raw,
        //   },
        // })
        // emit({
        //   type: "sessions.addMessage",
        //   data,
        // })

        return true
      } else if (!has_error && !stream_response) {
        emit({
          type: "generation/abort",
          data: {
            target: session_id,
          },
        })
        return error({
          message: "no response from the module",
          data: { module_id: module.specs.id },
        })
      }
    }
  }
}
