// @ts-ignore
import EasyEdit from "react-easy-edit"
import { MdOutlineKeyboardArrowDown, MdOutlineKeyboardArrowRight, MdCheck, MdClose } from "react-icons/md"
import { LLMVariantS } from "@/data/schemas/modules"
import _ from "lodash"
import { useState } from "react"
import { HiPlus } from "react-icons/hi"
import { useNavigate } from "react-router-dom"
import { zodToJsonSchema } from "zod-to-json-schema"
import { Match, Switch } from "react-solid-flow"
import useMemory from "../hooks/useMemory"

function getZodKeys({ schema }: { schema: any }) {
  const json_sc: any = zodToJsonSchema(schema)
  const active_keys = _.keys(json_sc.properties)
    .filter((key) => {
      return json_sc.properties[key]?.description !== "deprecated"
    })
    .map((key) => {
      return {
        key,
        type: json_sc.properties[key]?.type,
        optional: _.includes(json_sc.required, key) ? false : true,
      }
    })
  return active_keys
}

export function ModuleSettings({
  module,
  index,
  handleEdit,
  EditComponent,
}: {
  module: any
  index: number
  handleEdit: any
  EditComponent: any
}) {
  const mem: {
    field_edit_id: string
  } = useMemory({ id: "conductor/settings" })
  const [expanded_models, setExpandedModels] = useState<string[]>([
    ...module.meta.variants.map((v: any) => v.id),
    "new-variant",
  ])

  function setFieldEditId(id: string) {
    mem.field_edit_id = id
  }

  function humanizeVariableName(string: string) {
    if (!string) return
    let s = string.charAt(0).toUpperCase() + string.slice(1).replace(/_/g, " ")
    // replace api with API and don't care about case
    s = s.replace(/api/gi, "API")
    return s
  }

  function removeVariant({ variant_id }: { variant_id: string }) {
    const variants = _.filter(module.meta.variants, (v: any) => v.id !== variant_id)
    handleEdit({ module_id: module.id, value: variants, name: `meta.variants` })
  }

  let schema_keys: { key: string; type: string }[] = []
  if (module.meta.type.toLowerCase() === "llm") schema_keys = getZodKeys({ schema: LLMVariantS })

  return (
    <dialog id={`settings-${module.id}`} className="ModuleSetting modal w-full max-w-2xl ">
      <form method="dialog" className="modal-box bg-zinc-800/95 border-t border-t-zinc-600">
        <div className="flex w-full mb-2 pb-2 border-b border-b-zinc-700">
          <div className=" text-zinc-400 font-semibold">
            <h3 className="font-bold text-lg">{module.meta.vendor.name} settings</h3>
          </div>
          <div className="flex flex-1 items-end justify-end text-xs text-zinc-500">
            All changes are saved automatically
          </div>
        </div>
        <div className="flex flex-col w-full gap-1 mb-3" data-id={`${module.id}-description`}>
          <div className="flex flex-grow items-center text-sm font-bold text-zinc-400">Description</div>
          <div
            className="flex flex-grow w-full text-sm "
            onClick={() => {
              setFieldEditId(`${module.id}-description`)
              return false
            }}
          >
            <EasyEdit
              type="text"
              onSave={(data: any) => {
                setFieldEditId("")
                handleEdit({ module_id: module.id, value: data, name: `meta.description` })
              }}
              onCancel={() => setFieldEditId("")}
              onBlur={() => setFieldEditId("")}
              cancelOnBlur={true}
              saveButtonLabel={<MdCheck className="w-3 h-3 text-zinc-200" />}
              cancelButtonLabel={<MdClose className="w-3 h-3  text-zinc-200" />}
              onHoverCssClass={`cursor-pointer`}
              value={module.meta.description || "click to add description"}
              editComponent={<EditComponent />}
            />
          </div>
        </div>
        {module.settings?.api_key !== undefined && (
          <div className="flex flex-col w-full gap-1 mb-3" data-id={`${module.id}-apikey`}>
            <div className="flex flex-grow items-center text-sm font-bold text-zinc-400">
              {module.vendor} {module.name} API key
            </div>
            <div
              className="flex flex-grow w-full text-sm ph-no-capture"
              onClick={() => {
                setFieldEditId(`${module.id}-apikey`)
                return false
              }}
            >
              <EasyEdit
                type="text"
                onSave={(data: any) => {
                  setFieldEditId("")
                  handleEdit({ module_id: module.id, value: data, name: `settings.api_key` })
                }}
                onCancel={() => setFieldEditId("")}
                onBlur={() => setFieldEditId("")}
                cancelOnBlur={true}
                saveButtonLabel={<MdCheck className="w-3 h-3 text-zinc-200" />}
                cancelButtonLabel={<MdClose className="w-3 h-3  text-zinc-200" />}
                onHoverCssClass={`cursor-pointer`}
                value={module.settings.api_key || "click to add api key"}
                editComponent={<EditComponent />}
              />
            </div>
          </div>
        )}
        {Object.keys(module.settings).map((key: any, index: number) => {
          if (key === "api_key") return
          if (typeof module.settings[key] === "object") return
          return (
            <div
              key={`${module.id}-${key}`}
              className="flex flex-col w-full gap-1 mb-3"
              data-id={`${module.id}-${key}`}
            >
              <div className="flex flex-grow items-center text-sm font-bold text-zinc-400">
                {humanizeVariableName(key)}
              </div>
              <div
                className="flex flex-grow w-full text-sm "
                onClick={() => {
                  setFieldEditId(`${module.id}-settings-${key}}`)
                  return false
                }}
              >
                <EasyEdit
                  type="text"
                  onSave={(data: any) => {
                    setFieldEditId("")
                    handleEdit({ module_id: module.id, value: data, name: `settings.${key}` })
                  }}
                  onCancel={() => setFieldEditId("")}
                  onBlur={() => setFieldEditId("")}
                  cancelOnBlur={true}
                  saveButtonLabel={<MdCheck className="w-3 h-3 text-zinc-200" />}
                  cancelButtonLabel={<MdClose className="w-3 h-3  text-zinc-200" />}
                  onHoverCssClass={`cursor-pointer`}
                  value={
                    module.settings[key] !== "" && module.settings[key] !== undefined
                      ? module.settings[key]
                      : "click to set"
                  }
                  editComponent={<EditComponent />}
                />
              </div>
            </div>
          )
        })}
        {module.meta.variants?.length > 0 ? (
          <div className="flex flex-col w-full">
            <div className="flex flex-row w-full mt-6 mb-3 border-b border-b-zinc-600 ">
              <div className="flex flex-1 items-center  text-md font-semibold text-zinc-300">Models</div>
            </div>
            {_(module.meta.variants)
              .orderBy("id")
              .map((variant: any, variant_index: number) => {
                if (schema_keys?.length === 0 || !variant) return
                return (
                  <div key={`${module.id}-${variant.id}`} className="flex w-full flex-col mb-2">
                    <div
                      className="flex flex-row items-center text-sm font-bold text-zinc-300 w-full pb-2 border-b border-b-zinc-700 mb-1 cursor-pointer"
                      onClick={() => {
                        if (expanded_models.indexOf(variant.id) === -1) {
                          setExpandedModels([...expanded_models, variant.id])
                        } else {
                          setExpandedModels(expanded_models.filter((id) => id !== variant.id))
                        }
                      }}
                    >
                      <div className="flex flex-1">
                        {expanded_models.indexOf(variant.id) !== -1 ? (
                          <MdOutlineKeyboardArrowRight className="w-5 h-5 mr-1" />
                        ) : (
                          <MdOutlineKeyboardArrowDown className="w-5 h-5 mr-1" />
                        )}{" "}
                        {variant.name.toUpperCase()}
                      </div>
                      <div
                        className="flex flex-shrink justify-end tooltip tooltip-left font-normal"
                        data-tip="Remove model from this module"
                      >
                        <HiPlus
                          className="w-3 h-3 mr-1 rotate-45 text-zinc-500 hover:text-red-700"
                          onClick={() =>
                            confirm("Are you sure you want to remove this model?")
                              ? removeVariant({ variant_id: variant.id })
                              : null
                          }
                        />
                      </div>
                    </div>

                    {expanded_models.indexOf(variant.id) === -1 &&
                      schema_keys.map((schema: any) => {
                        const { key, type, optional } = schema
                        const v_index = _.findIndex(module.meta.variants, (v: any) => v.id === variant.id)
                        const edit_key = `meta.variants.${v_index}.${key}`
                        const value = _.get(module, edit_key)
                        if (optional && !value) return
                        return (
                          <div
                            key={`${module.id}-${variant.id}-${key}`}
                            className={`flex w-full gap-1 mb-3 px-2 ${type === "object" ? "flex-col" : "flex-row"}`}
                            data-id={`${module.id}-${variant.id}`}
                          >
                            <div className="flex flex-1 items-center text-sm font-bold text-zinc-400">
                              {humanizeVariableName(key)}
                            </div>
                            <div
                              className="flex flex-1 max-w-1/2 flex-col justify-end items-end text-right w-full text-sm "
                              onClick={() => {
                                setFieldEditId(edit_key)
                                return false
                              }}
                            >
                              <Switch>
                                <Match when={type === "boolean"}>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      onChange={() => {
                                        handleEdit({
                                          module_id: module.id,
                                          value: !_.get(module, `meta.variants.${v_index}.${key}`),
                                          name: edit_key,
                                        })
                                      }}
                                      checked={
                                        _.get(module, `meta.variants.${v_index}.${key}`) === false ? false : true
                                      }
                                      className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                  </label>
                                </Match>
                                <Match when={type === "string" || type === "number"}>
                                  <EasyEdit
                                    type="text"
                                    onSave={(data: any) => {
                                      setFieldEditId("")
                                      handleEdit({ module_id: module.id, value: data, name: edit_key })
                                    }}
                                    onCancel={() => setFieldEditId("")}
                                    onBlur={() => setFieldEditId("")}
                                    cancelOnBlur={true}
                                    saveButtonLabel={<MdCheck className="w-3 h-3 text-zinc-200" />}
                                    cancelButtonLabel={<MdClose className="w-3 h-3  text-zinc-200" />}
                                    onHoverCssClass={`cursor-pointer`}
                                    value={_.get(module, `meta.variants.${v_index}.${key}`) || "click to add"}
                                    editComponent={<EditComponent />}
                                  />
                                </Match>
                                <Match when={type === "object"}>
                                  {Object.keys(_.get(module, `meta.variants.${v_index}.${key}`) || {}).map(
                                    (item: any, sub_index: number) => {
                                      let sub_value = _.get(module, `meta.variants.${v_index}.${key}.${item}`)
                                      if (typeof sub_value === "string") sub_value = sub_value?.replace(/\n/g, "\\n")

                                      return (
                                        <div className="flex w-full flex-row my-1" key={`sub-key-${sub_index}`}>
                                          <div className="flex flex-1 justify-start text-xs font-semibold text-zinc-300 pl-2">
                                            {item}
                                          </div>
                                          <EasyEdit
                                            type="text"
                                            onSave={(data: any) => {
                                              setFieldEditId("")
                                              handleEdit({
                                                module_id: module.id,
                                                value: data,
                                                name: `meta.variants.${v_index}.${key}.${item}`,
                                              })
                                            }}
                                            onCancel={() => setFieldEditId("")}
                                            onBlur={() => setFieldEditId("")}
                                            cancelOnBlur={true}
                                            saveButtonLabel={<MdCheck className="w-3 h-3 text-zinc-200" />}
                                            cancelButtonLabel={<MdClose className="w-3 h-3  text-zinc-200" />}
                                            onHoverCssClass={`cursor-pointer`}
                                            value={
                                              sub_value !== undefined && sub_value !== "" ? sub_value : "click to add"
                                            }
                                            editComponent={<EditComponent />}
                                          />
                                        </div>
                                      )
                                    }
                                  )}
                                </Match>
                              </Switch>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )
              })
              .value()}
            {/* <div key={`${module.id}-add-new-variant`} className="flex w-full flex-col mb-2">
              <div
                className="flex flex-row items-center text-sm font-bold text-zinc-400 hover:text-zinc-300 w-full pb-2 pl-1 border-b border-b-zinc-700 mb-1 cursor-pointer"
                onClick={() => {
                  if (expanded_models.indexOf("new-variant") === -1) {
                    setExpandedModels([...expanded_models, "new-variant"])
                  } else {
                    setExpandedModels(expanded_models.filter((id) => id !== "new-variant"))
                  }
                }}
              >
                <HiPlus className="w-3 h-3 mr-1" /> Add new model
              </div>

              {expanded_models.indexOf("new-variant") === -1 &&
                schema_keys.map((schema: any) => {
                  const { key, type } = schema
                  const variant_index = _.size(module.meta.variants)
                  const edit_key = `meta.variants.${variant_index}.${key}`
                  if (key !== "id") return null
                  return (
                    <div
                      key={`${module.id}-new-variant-${key}`}
                      className="flex flex-row w-full gap-1 mb-3 px-2"
                      data-id={`${module.id}-new-variant`}
                    >
                      <div className="flex flex-1 items-center text-sm font-bold text-zinc-400">
                        {humanizeVariableName(key)}
                      </div>
                      <div
                        className="flex flex-1 justify-end items-end text-right w-full text-sm "
                        onClick={() => {
                          setFieldEditId(edit_key)
                          return false
                        }}
                      >
                        {type !== "boolean" ? (
                          <EasyEdit
                            type="text"
                            onSave={(data: any) => {
                              if (_.filter(module.meta.variants, (v: any) => v.id === data).length > 0) {
                                return error({ message: `Variant with id ${data} already exists` })
                              }
                              setExpandedModels(expanded_models.filter((id) => id !== "new-variant"))
                              setFieldEditId("")
                              setTimeout(() => {
                                handleEdit({ module_id: module.id, value: data, name: edit_key })
                                navigate(`/c/settings`)
                              }, 100)
                            }}
                            onCancel={() => setFieldEditId("")}
                            onBlur={() => setFieldEditId("")}
                            cancelOnBlur={true}
                            saveButtonLabel={<MdCheck className="w-3 h-3 text-zinc-200" />}
                            cancelButtonLabel={<MdClose className="w-3 h-3  text-zinc-200" />}
                            onHoverCssClass={`cursor-pointer`}
                            value={_.get(module, `meta.variants.${variant_index}.${key}`) || "click to add"}
                            editComponent={<EditComponent />}
                          />
                        ) : null}
                      </div>
                    </div>
                  )
                })}
            </div> */}
          </div>
        ) : null}

        <div className="modal-action">
          <button className="btn w-full">Done</button>
        </div>
      </form>
    </dialog>
  )
}
