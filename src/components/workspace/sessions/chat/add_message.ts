import { TextMessageT } from "@/data/loaders/sessions"
import SessionsActions from "@/data/actions/sessions"
import _ from "lodash"
import { compileSlidingWindowMemory } from "@/components/libraries/memory"
import { main as CostEstimator, InputT as CostEstimatorInputT } from "@/modules/openai-cost-estimator/"
import { error } from "@/components/libraries/logging"
import { UserT } from "@/data/loaders/user"
import { MessageRowT } from "."
import { nanoid } from "nanoid"

export async function addMessage({
  session,
  session_id,
  api_key,
  module,
  processed_messages,
  branch_parent_id,
  message,
  message_id,
  raw_messages,
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
}: {
  session: any
  session_id: string
  api_key: string
  module: any
  processed_messages: MessageRowT[]
  branch_parent_id: string | boolean
  message: string
  message_id?: string
  raw_messages: TextMessageT[]
  user_state: UserT
  callbacks: {
    setGenInProgress: Function
    setMsgUpdateTs: Function
    setMsgsInMem: Function
    setGenController: Function
    setBranchParentId: Function
    appendOrUpdateProcessedMessage: Function
    addRawMessage: Function
  }
}): Promise<boolean | undefined> {
  if (!api_key) return false
  if (!module) throw new Error("No module")
  // const CostEstimator = new ComlinkWorker(new URL('../../modules/openai-cost-estimator/index.ts', import.meta.url), {/* normal Worker options*/})
  // console.log(await CostEstimator.main())
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
      console.log("resending")
      resend = true
    } else if (!parent_msg && _.size(raw_messages) > 0) {
      console.log("no parent")
      return false
    }
  }

  if (message || resend) {
    let m: TextMessageT | undefined = undefined

    const memory = await compileSlidingWindowMemory({
      model: session?.settings.module.variant,
      prompt: {
        instructions: "you are a helpful assistant",
        user: message,
      },
      messages: _.map(processed_messages, (m) => m[1]),
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
          source: "user",
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

      setMsgsInMem(memory ? memory.included_ids : [])
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
            setGenInProgress(false)
            error({ message: data.message || data.code, data })
          },
        }
      )

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
        setGenInProgress(false)

        const model = user_state.modules.installed.find((m: any) => m.id === session.settings.module.id)
        const variant = _.find(model?.meta.variants, { id: session.settings.module.variant })
        const costs = await CostEstimator({
          model: session.settings.module.variant,
          response: response || stream_response || "",
          costs: { input: variant?.cost_input || 0, output: variant?.cost_output || 0 },
        })
        if (!costs)
          return error({ message: "error in computing costs", data: { model: session.settings.module.variant } })
        console.log(`Output tokens: ${costs.tokens}, USD: $${costs.usd}`)
        return true
      } else if (!has_error && !response && !stream_response) {
        return error({ message: "no response from the module", data: { module_id: module.specs.id } })
      }
    }
  }
}
