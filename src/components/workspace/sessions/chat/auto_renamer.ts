import { TextMessageT } from "@/data/loaders/sessions"
import _ from "lodash"
import { compileSlidingWindowMemory } from "@/libraries/memory"
import { error } from "@/libraries/logging"
import { Module } from "@/modules"
import SessionsActions from "@/data/actions/sessions"

export async function autoRename({
  messages,
  user_id,
  session_id,
}: {
  session_id: string
  user_id: string
  messages: TextMessageT[]
}) {
  const module = await Module("ule")
  if (!module) throw new Error("No module")

  let stream_response = ""
  function onData({ data }: { data: any }) {
    if (data) {
      stream_response += data
    }
  }
  let has_error = false
  const prompt = {
    instructions:
      "Based on the conversation, what three-word title best encapsulates its content? No chat, no verbose. Use the following format to answer: 'Title: {The title}'",
    user: messages.map((m) => `${m.type}: ${m.text}`).join("\n"),
  }
  const memory = await compileSlidingWindowMemory({
    model: "mistralai_mistral-7b-instruct",
    prompt,
    messages: [],
    module,
  })
  if (!memory) return error({ message: "error compiling memory", data: { module_id: module.specs.id } })
  const { receipt } = await module?.main(
    {
      model: "mistralai_mistral-7b-instruct",
      user_id,
      prompt,
      history: memory?.history || [],
      settings: {
        temperature: 0.5,
        max_tokens: 5,
      },
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
  if (receipt) {
    receipt.details.type = "auto_session_rename"
    SessionsActions.addCost({
      session_id,
      receipt,
    })
  } else {
    // error({ message: "ULE didn't sent receipt, contact support", data: { module_id: module.specs.id } })
  }
  if (stream_response) {
    // remove " characters and if response ends with dot, remove that too
    return stream_response.trim().replace(/"/g, "").replace(/\.$/, "").replace(/title:\s*|Title:\s*/gi, '')
  } else if (!has_error && !stream_response) {
    error({ message: "no response from the module", data: { module_id: module.specs.id } })
  }
}
