import { UserT } from "@/data/loaders/user"
import { AIsT } from "@/data/schemas/ai"
import _ from "lodash"

export default function generate_llm_module_options({
  user_state,
  ai_state,
  selected,
  include_limits = true,
  return_as_object = false,
}: {
  user_state: UserT
  ai_state: AIsT
  selected?: string
  include_limits?: boolean
  return_as_object?: boolean
}) {
  const active_ais = user_state?.ais?.filter((ai) => ai.status === "active")
  const objects = _.map(active_ais, (ai) => {
    return _.find(ai_state, { id: ai.id })
  })
  // expand modules into array of objects based on variants
  let result = _.reduce(
    objects,
    (acc: any, object) => {
      const id = _.get(object, "id")
      const name = _.get(object, "meta.name")

      if (id && name) {
        acc.push({
          id,
          name,
        })
      }

      return acc
    },
    []
  )

  // Sort by vendor and id
  result = _.sortBy(result, "name")
  if (return_as_object)
    return result.map((ai: any) => {
      return {
        value: ai.id,
        label: ai.name,
      }
    })
  return result.map((ai: any) => {
    return (
      <option
        key={ai.id}
        value={ai.id}
        /* selected={selected === `{"id": "${mod.id}", "variant": "${mod.variant}"}`} */
      >
        {ai.name}
      </option>
    )
  })
}
