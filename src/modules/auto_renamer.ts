import { TextMessageT } from "@/data/loaders/sessions"
import _ from "lodash"
import { compileSlidingWindowMemory } from "@/libraries/ai"
import { error } from "@/libraries/logging"
import { Module } from "@/modules"
import SessionsActions from "@/data/actions/sessions"
import { mChatSessionT } from "@/data/schemas/memory"
import { getMemoryState } from "@/libraries/memory"

export async function autoRename({
  messages,
  user_id,
  session_id,
}: {
  session_id: string
  user_id: string
  messages: TextMessageT[]
}) {
  const mem_session = getMemoryState<mChatSessionT>({ id: `session-${session_id}` })
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
    // instructions: `Conversation:\n${messages.map((m) => `${m.type}: ${m.text}`).join("\n")}`,
    user: `Conversation:\n${messages
      .map((m) => `${m.type}: ${m.text}`)
      .join(
        "\n"
      )}\n\nBased on the conversation, what three-word title best encapsulates its content? No chat, no verbose. Use the following format to answer: 'Title: {The title}'`,
  }
  const memory = await compileSlidingWindowMemory({
    model: "mistralai_mistral-7b-instruct-free",
    prompt,
    messages,
    session_id,
    // module,
  })
  if (!memory) return error({ message: "error compiling memory", data: { module_id: module.specs.id } })
  const { receipt } = await module?.main(
    {
      model: "mistralai_mistral-7b-instruct-free",
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
        error({ message: 'LLM provider server connection issues', data })
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
    return stream_response
      .trim()
      .replace(/"/g, "")
      .replace(/\.$/, "")
      .replace(/title:\s*|Title:\s*/gi, "")
      .slice(0, 70)
  } else if (!has_error && !stream_response) {
    error({ message: "no response from the module", data: { module_id: module.specs.id } })
  }
}
function getMemorySession(arg0: { id: string }) {
  throw new Error("Function not implemented.")
}
