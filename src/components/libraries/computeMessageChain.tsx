import { TextMessageT } from "@/data/loaders/sessions"
import _ from "lodash"
import { MessageRowT } from "@/components/workspace/sessions/chat"

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
