import { TextMessageT } from "@/data/loaders/sessions"
import { nanoid } from "nanoid"
import { initLoaders } from "@/data/loaders"
import _ from "lodash"
import { emit, query } from "@/libraries/events"
import { fieldFocus } from "@/libraries/field_focus"
import { error } from "@/libraries/logging"
import SessionsActions from "@/data/actions/sessions"
import { MessageRowT } from "@/data/schemas/sessions"

// create new branch
export const onNewBranchClick = async ({ session_id, parent_id }: { session_id: string; parent_id: string }) => {
  // mark other messages with same parent_id as not active
  const { MessagesState } = await initLoaders()
  const ss = await MessagesState({ session_id })
  const msgs: TextMessageT[] = ss?.get()
  const raw_messages = _.uniqBy(msgs || [], "id")
  let updated_raw_messages = _.cloneDeep(raw_messages || [])
  const new_branch_msg: TextMessageT = {
    _v: 1,
    id: nanoid(10),
    created_at: new Date().toISOString(),
    version: "1.0",
    type: "human",
    status: "pending",
    text: "type new message below...",
    meta: {
      role: "temp",
    },
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

  emit({
    type: "chat/new-branch",
    data: {
      target: session_id,
      id: new_branch_msg.id,
      parent_id,
    },
  })
  // hacky settimeout because react...
  setTimeout(() => {
    emit({
      type: "chat/raw-messages",
      data: {
        target: session_id,
        messages: updated_raw_messages,
      },
    })
    fieldFocus({ selector: "#input" })
  }, 200)
}

// switch active branch
export const onBranchClick = async ({
  session_id,
  msg_id,
  no_update,
  msgs,
}: {
  session_id: string
  msg_id: string
  no_update?: boolean
  msgs?: TextMessageT[]
}) => {
  let messages = msgs
  if (!messages) {
    messages = await query({
      type: "sessions.getMessages",
      data: {
        session_id,
      }
    })
  }
  if (!messages) return error({ message: "Session messages not found" })
  
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

  emit({
    type: "chat/raw-messages",
    data: {
      target: session_id,
      messages: updated_messages,
    },
  })
  await SessionsActions.updateMessages({ session_id, messages: updated_messages })
}

// Build message tree
export const computeActivePath = (messages: TextMessageT[]): Record<string, string> => {
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

export const buildMessageTree = ({
  messages,
  first_id,
  activePath,
}: {
  messages: TextMessageT[]
  first_id: string
  activePath: Record<string, string>
}) => {
  if (!messages || _.size(messages) === 0) return
  const first_message = _(messages)
    .compact()
    .find((msg) => msg.parent_id === first_id)
  if (!first_message) return
  const rows: MessageRowT[] = [[[], first_message, []]]
  let parent_id = first_id

  for (const parent in activePath) {
    if (Object.prototype.hasOwnProperty.call(activePath, parent)) {
      const next_msg_id = activePath[parent]
      const r: MessageRowT | undefined = buildRows({ messages, row_parent_id: next_msg_id })
      if (r && r?.length === 3 && r[1] !== undefined) {
        rows.push(r)
        parent_id = activePath[r[1].id]
      } else {
        break
      }
    }
  }
  return rows
}

const buildRows = ({
  messages,
  row_parent_id,
}: {
  messages: TextMessageT[]
  row_parent_id: string
}): MessageRowT | undefined => {
  // get all branches
  const branches: TextMessageT[] = _(messages)
    .compact()
    .filter((msg) => msg.parent_id === row_parent_id)
    .uniqBy("id")
    .value()
  let active_branch = branches.find((msg) => msg.active)
  let active_branch_index: number = 0
  if (active_branch) {
    active_branch_index = _.findIndex(branches, { id: active_branch.id })
  }
  if (active_branch_index === -1) active_branch_index = 0
  if (!active_branch) active_branch = branches[active_branch_index]

  // filter all messages except the active branch
  const nonactive_branches = _(branches)
    .compact()
    .filter((msg) => msg.id !== active_branch?.id)
    .uniqBy("id")
    .value()

  return [[], branches[active_branch_index], nonactive_branches]
}
