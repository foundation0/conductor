import { TextMessageT } from "@/data/loaders/sessions"
import SessionsActions from "@/data/actions/sessions"
import _ from "lodash"
import { compileSlidingWindowMemory } from "@/libraries/memory"
import { error } from "@/libraries/logging"
import { UserT } from "@/data/loaders/user"
import { MessageRowT } from "@/data/schemas/sessions"
import { nanoid } from "nanoid"
import { AIT } from "@/data/schemas/ai"
import { AIToInstruction } from "@/libraries/ai"
import { ReceiptT } from "@/data/schemas/sessions"

export async function addMessage({
  session,
  session_id,
  module,
  context,
  processed_messages,
  branch_parent_id,
  message,
  meta,
  message_id,
  raw_messages,
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
    onError,
  },
}: {
  session: any
  session_id: string
  module: any
  context?: { pageContent: string; metadata: { id: string; name: string } }[]
  processed_messages: MessageRowT[]
  branch_parent_id: string | boolean
  message: string
  meta: TextMessageT["meta"]
  message_id?: string
  raw_messages: TextMessageT[]
  user_state: UserT
  ai: AIT
  callbacks: {
    setGenInProgress: Function
    setMsgUpdateTs: Function
    setMsgsInMem: Function
    setGenController: Function
    setBranchParentId: Function
    appendOrUpdateProcessedMessage: Function
    addRawMessage: Function
    onError?: Function
  }
}): Promise<boolean | undefined> {
  if (!module) throw new Error("No module")
  // if no activePath, use first as parent id
  let parent_id = "first"
  // if activePath exists, set parent id as the last message id in the chain
  if (processed_messages && processed_messages.length > 0)
    parent_id = processed_messages[processed_messages.length - 1][1].id
  // unless branch parent id is set, then message should use that
  if (branch_parent_id) parent_id = branch_parent_id as string

  // sanity check, get parent message
  let resend = false
  if (parent_id !== "first") {
    const parent_msg = raw_messages?.find((msg: any) => msg.id === parent_id)
    if (parent_msg?.type === "human") {
      // console.log("resending")
      resend = true
    } else if (!parent_msg && _.size(raw_messages) > 0) {
      // console.log("no parent")
      return false
    }
  }

  let ctx = ""
  if (context && context?.length > 0) {
    ctx = `## CONTEXT ##\n\n${context
      .map((c) => `ID: ${c.metadata.id}\nDOC NAME: ${c.metadata.name}\n\n${c.pageContent}`)
      .join("\n\n---\n\n")}\n\n## CONTEXT ENDS ##\n\n`
  }

  if (message || resend) {
    let m: TextMessageT | undefined = undefined

    const memory = await compileSlidingWindowMemory({
      model: session?.settings.module.variant,
      prompt: {
        instructions: AIToInstruction({ ai }) || "you are a helpful assistant",
        user: `${ctx}${message}`,
      },
      messages: _.map(processed_messages, (m) => m[1]).filter((m) => m.hash !== "1337"), // 1337 is the hash for temporary messages - TODO: use meta.role for this
      module,
    })
    if (!memory) {
      setGenInProgress(false)
      setMsgUpdateTs(new Date().getTime())
      return false
    }
    const variant = _.find(module?.specs.meta.variants, { id: session?.settings.module.variant })
    if ((memory?.token_count || 0) > variant.context_len) {
      setGenInProgress(false)
      setMsgUpdateTs(new Date().getTime())
      return false
    }

    // @ts-ignore
    if (resend) m = _.last(processed_messages)?.[1]
    else {
      const msg: { session_id: string; message: Partial<TextMessageT> } = {
        session_id,
        message: {
          _v: 1,
          id: message_id || nanoid(10),
          type: "human",
          hash: "123",
          text: message,
          meta: meta || { role: "msg" },
          context: ctx,
          source: `user:${user_state.id}`,
          active: true,
          parent_id,
        },
      }
      m = await SessionsActions.addMessage(msg)
      addRawMessage({ message: m })
    }
    setGenInProgress(true)
    // setMsgUpdateTs(new Date().getTime())
    if (m) {
      const source = `ai:${module?.specs?.id}/${session?.settings.module.variant}/${ai?.id}`
      let stream_response = ""
      function onData({ data }: { data: any }) {
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
            },
          })
          setMsgUpdateTs(new Date().getTime())
        }
      }
      let has_error = false
      const prompt = {
        instructions: `${AIToInstruction({ ai })}\n\n${ctx}` || "you are a helpful assistant",
        user: `${m.text}`,
      }

      setMsgsInMem(memory ? memory.included_ids : [])

      // prepend the first type human message in history with ctx
      /* const first_human_msg = _.findIndex(memory?.history, { role: "user" })
      if (first_human_msg > -1) {
        memory.history[first_human_msg].content = `${ctx}${memory.history[first_human_msg].content}`
      } */

      const { receipt } = (await module?.main(
        {
          model: session?.settings.module.variant,
          user_id: user_state.id,
          settings:
            _.find(user_state.modules.installed, { id: session?.settings.module.id })?.meta.variants?.find(
              (v) => v.id === session?.settings.module.variant
            )?.settings || {},
          prompt,
          history: memory?.history || [],
        },
        {
          setGenController,
          onData,
          onClose: () => {},
          onError: (data: any) => {
            has_error = true
            setGenInProgress(false)
            if (!data.surpress) error({ message: data.message || data.code, data })
            onError && onError()
          },
        }
      )) as { receipt: ReceiptT }

      if (stream_response) {
        const aim: TextMessageT = await SessionsActions.addMessage({
          session_id,
          message: {
            type: "ai",
            hash: "123",
            text: stream_response,
            source,
            parent_id: m.id,
          },
        })
        setBranchParentId(false)
        setMsgUpdateTs(new Date().getTime())
        setGenInProgress(false)

        const model = user_state.modules.installed.find((m: any) => m.id === session.settings.module.id)
        const variant = _.find(model?.meta.variants, { id: session.settings.module.variant })

        /* const costs = await CostEstimator({
          model: session.settings.module.variant,
          response: response || stream_response || "",
          costs: { input: variant?.cost_input || 0, output: variant?.cost_output || 0 },
        }) */

        /* 
        if (!receipt)
          return error({ message: "error in computing costs", data: { model: session.settings.module.variant } })
        console.log(
          `Input: ${receipt.details.input.tokens} tokens, $${receipt.details.input.cost_usd} : Output: ${receipt.details.output.tokens} tokens, $${receipt.details.output.cost_usd} : Total: $${receipt.cost_usd}`
        )
        SessionsActions.addCost({
          session_id,
          receipt,
        }) 
        */

        return true
      } else if (!has_error && !stream_response) {
        return error({ message: "no response from the module", data: { module_id: module.specs.id } })
      }
    }
  }
}
