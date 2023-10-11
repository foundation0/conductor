import { UserT } from "@/data/loaders/user"
import UserActions from "@/data/actions/user"
import _ from "lodash"

export async function markExperienceAsComplete({
  user_state,
  experience_id,
}: {
  user_state: UserT
  experience_id: string
}) {
  const new_user_state = _.cloneDeep(user_state)
  if (!new_user_state.experiences) new_user_state.experiences = []
  if (!new_user_state.experiences.find((e) => e.id === experience_id)) {
    new_user_state.experiences.push({
      id: experience_id,
      completed: true,
    })
  }
  await UserActions.updateUser(new_user_state)
}
