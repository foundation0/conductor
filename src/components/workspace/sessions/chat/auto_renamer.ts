import { TextMessageT } from "@/data/loaders/sessions"
import SessionsActions from "@/data/actions/sessions"
import _ from "lodash"
import { compileSlidingWindowMemory } from "@/components/libraries/memory"
import { main as CostEstimator, InputT as CostEstimatorInputT } from "@/modules/openai-cost-estimator/"
import { error } from "@/components/libraries/logging"
import { UserT } from "@/data/loaders/user"
import { MessageRowT } from "."
import { nanoid } from "nanoid"

export async function autoRename({
  api_key,
  module,
  messages,
}: {
  api_key: string
  module: any
  messages: TextMessageT[]
}) {
  if (!api_key) return
  if (!module) throw new Error("No module")

  let stream_response = ""
  function onData({ data }: { data: any }) {
    if (data) {
      stream_response += data
    }
  }
  let has_error = false
  const prompt = {
    instructions: "",
    user: "Based on the above conversation, describe this conversation with maximum three words. Answer only, no chat, no verbose.",
  }
  const memory = await compileSlidingWindowMemory({
    model: "gpt-3.5-turbo",
    prompt,
    messages,
    module,
  })
  console.info(`Message tokens: ${memory?.token_count}, USD: $${memory?.usd_cost}`)
  const response = await module?.main(
    {
      model: "gpt-3.5-turbo",
      api_key,
      prompt,
      history: memory?.history || [],
    },
    {
      onData,
      onClose: () => {},
      onError: (data: any) => {
        has_error = true
        error({ message: data.message || data.code, data })
      },
    }
  )

  if (response || stream_response) {
    // remove " characters and if response ends with dot, remove that too
    return (response || stream_response).trim().replace(/"/g, "").replace(/\.$/, "")
  } else if (!has_error && !response && !stream_response) {
    error({ message: "no response from the module", data: { module_id: module.specs.id } })
  }
}
