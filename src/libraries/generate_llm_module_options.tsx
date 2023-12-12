import { UserT } from "@/data/loaders/user"
import _, { has } from "lodash"
import { getMemoryState } from "@/libraries/memory"
import { mBalancesT, mPricesT } from "@/data/schemas/memory"

export default function generate_llm_module_options({
  user_state,
  selected,
  include_limits = true,
  return_as_object = false,
}: {
  user_state: UserT
  selected?: string
  include_limits?: boolean
  return_as_object?: boolean
}) {
  const mem_pricing = getMemoryState({ id: 'prices' }) as mPricesT
  const mem_balances = getMemoryState({ id: 'balances' }) as mBalancesT

  const objects = user_state.modules.installed.filter(
    (mod) => mod.meta.type === "LLM" && mod.active,
  )
  // expand modules into array of objects based on variants
  let result = _.reduce(
    objects,
    (acc: any, object) => {
      const id_model = _.get(object, "id")
      const name_model = _.get(object, "meta.name")
      const api_key = _.get(object, "settings.api_key")
      const variants = _.get(object, "meta.variants")

      if (id_model && variants) {
        const variantIds = _.map(variants, "id")

        _.forEach(variantIds, (id: any, i: number) => {
          if (variants[i].active === false) return
          let active: boolean = variants[i].active || true
          const model_price = _.find(mem_pricing?.prices || [], { id: variants[i].id})
          let has_cost = true
          if(model_price){
            has_cost = Number(model_price?.input_price) > 0 || Number(model_price?.output_price) > 0
            if(has_cost && Number(mem_balances?.credits) === 0) active = false
            // console.log(model_price, has_cost, mem_balances?.credits, active)
          }
          acc.push({
            id: id_model,
            name: name_model || id_model,
            has_api_key: api_key ? true : false,
            variant: id,
            variant_name: variants[i].name || variants[i].id,
            context_len: variants[i].context_len,
            has_cost,
            active
          })
        })
      }

      return acc
    },
    [],
  )

  // Sort by vendor and id
  result = _.sortBy(result, ["id", "variant"])
  if (return_as_object)
    return result.map((mod: any) => {
      return {
        disabled: !mod.active,
        value: `${mod.id}/${mod.variant}`,
        label: `${mod.name || mod.id} / ${mod.variant_name} ${
          mod.context_len && include_limits ?
            `(~${_.round(mod.context_len * 0.8, 0)} word memory)`
          : ""
        }`,
      }
    })
  return result.map((mod: any) => {
    return (
      <option
        disabled={!mod.active}
        key={`{"id": "${mod.id}", "variant": "${mod.variant}"}`}
        value={`{"id": "${mod.id}", "variant": "${mod.variant}"}`}
        /* selected={selected === `{"id": "${mod.id}", "variant": "${mod.variant}"}`} */
      >
        {`${mod.id} / ${mod.variant} ${
          mod.context_len && include_limits ?
            `(~${_.round(mod.context_len * 0.8, 0)} word memory)`
          : ""
        }`}
        {!mod.has_api_key ? " (no api key)" : ""}
      </option>
    )
  })
}
