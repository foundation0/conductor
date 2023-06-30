import { UserT } from "@/data/loaders/user"
import _ from "lodash"

export default function generateLLMModuleOptions({ user_state, selected }: { user_state: UserT, selected?: string }) {
  const objects = user_state.modules.installed.filter((mod) => mod.meta.type === "LLM")
  // expand modules into array of objects based on variants
  let result = _.reduce(
    objects,
    (acc: any, object) => {
      const id_model = _.get(object, "id")
      const api_key = _.get(object, "settings.api_key")
      const variants = _.get(object, "meta.variants")

      if (id_model && variants) {
        const variantIds = _.map(variants, "id")

        _.forEach(variantIds, (id) => {
          acc.push({ id: id_model, has_api_key: api_key ? true : false, variant: id })
        })
      }

      return acc
    },
    []
  )

  // Sort by vendor and id
  result = _.sortBy(result, ["id", "variant"])

  return result.map((mod: any) => {
    return (
      <option
        disabled={!mod.has_api_key}
        key={`{"id": "${mod.id}", "variant": "${mod.variant}"}`}
        value={`{"id": "${mod.id}", "variant": "${mod.variant}"}`}
        /* selected={selected === `{"id": "${mod.id}", "variant": "${mod.variant}"}`} */
      >
        {`${mod.id} / ${mod.variant}`}
        {!mod.has_api_key ? " (no api key)" : ""}
      </option>
    )
  })
}
