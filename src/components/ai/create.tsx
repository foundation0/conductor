import { UserT } from "@/data/loaders/user"
import { useCallback, useEffect, useState } from "react"
import { BiRightArrowAlt } from "react-icons/bi"
import { useNavigate, useParams } from "react-router-dom"
import { RichTextarea } from "rich-textarea"
import generate_llm_module_options from "@/libraries/generate_llm_module_options"
import Select from "react-select"
import AIIcon from "@/assets/icons/ai.svg"
import { RiAddCircleFill } from "react-icons/ri"
import {
  MdClose,
  MdOutlineAddAPhoto,
  MdOutlineKeyboardArrowDown,
  MdOutlineKeyboardArrowRight,
} from "react-icons/md"
import { AIS, AIT, AIsT, LLMModuleT, PersonaS } from "@/data/schemas/ai"
import { fieldFocus } from "@/libraries/field_focus"
import _ from "lodash"
import { error } from "@/libraries/logging"
import AIActions from "@/data/actions/ai"
import config from "@/config"
import useMemory from "../hooks/useMemory"
import { getAvatar } from "@/libraries/ai"
import { useDropzone } from "react-dropzone"
import { emit } from "@/libraries/events"

import examples from "./examples"
import { cn } from "@/libraries/utilities"

const initial = {
  avatar: "",
  values: examples["Empty"],
  values_show: {
    description: true,
    audience: false,
    background: false,
    styles: false,
    traits: false,
    responsibilities: false,
    limitations: false,
    response_examples: false,
    welcome_message: false,
    prompt_suggestions: false,
    custom_instructions: false,
  },
  creation_in_process: false,
  selected_llm: `${config.defaults.llm_module.id}/${config.defaults.llm_module.variant_id}`,
}

export default function CreatePersona() {
  const user_state = useMemory<UserT>({ id: "user" })
  const ai_state = useMemory<AIsT>({ id: "ais" })
  if (!user_state || !ai_state) return null

  const mem_ai = useMemory<{
    values: AIT["persona"]
    avatar: string
    values_show: {
      description: boolean
      audience: boolean
      background: boolean
      styles: boolean
      traits: boolean
      responsibilities: boolean
      limitations: boolean
      response_examples: boolean
      welcome_message: boolean
      prompt_suggestions: boolean
      custom_instructions: boolean
    }
    creation_in_process: boolean
    selected_llm: string
  }>({
    id: "ai-creation",
    state: initial,
  })

  const { values_show, creation_in_process, selected_llm, values } = mem_ai

  // stupid hack to avoid re-rendering issue with Rich Textarea component and valtio
  const [name, set_name] = useState("")
  const [description, set_description] = useState("")
  const [audience, set_audience] = useState("")
  const [background, set_background] = useState("")
  const [styles, set_styles] = useState([""])
  const [traits, set_traits] = useState([{ skill: "", value: 0 }])
  const [responsibilities, set_responsibilities] = useState([""])
  const [limitations, set_limitations] = useState([""])
  const [response_examples, set_response_examples] = useState([
    { message: "", response: "" },
  ])
  const [welcome_message, set_welcome_message] = useState("")
  const [prompt_suggestions, set_prompt_suggestions] = useState([""])
  const [custom_instructions, set_custom_instructions] = useState("")
  const [imported_ai_json, set_imported_ai_json] = useState("")

  useEffect(() => {
    set_name(mem_ai.values.name)
    set_description(mem_ai.values.description)
    if (mem_ai.values) {
      if (mem_ai.values.audience) {
        set_audience(mem_ai.values.audience)
      }
      if (mem_ai.values.background) {
        set_background(mem_ai.values.background)
      }
      if (mem_ai.values.styles) {
        set_styles(mem_ai.values.styles)
      }
      if (mem_ai.values.traits) {
        set_traits(mem_ai.values.traits)
      }
      if (mem_ai.values.responsibilities) {
        set_responsibilities(mem_ai.values.responsibilities)
      }
      if (mem_ai.values.limitations) {
        set_limitations(mem_ai.values.limitations)
      }
      if (mem_ai.values.response_examples) {
        set_response_examples(
          mem_ai.values.response_examples.filter(
            (example) => example !== undefined,
          ) as { message: string; response: string }[],
        )
      }
      if (mem_ai.values.welcome_message) {
        set_welcome_message(mem_ai.values.welcome_message)
      }
      if (mem_ai.values.prompt_suggestions) {
        set_prompt_suggestions(mem_ai.values.prompt_suggestions)
      }
      if (mem_ai.values.custom_instructions) {
        set_custom_instructions(mem_ai.values.custom_instructions)
      }
    }
  }, [JSON.stringify(mem_ai.values)])

  const edit_ai_id = useParams().edit_ai_id
  const navigate = useNavigate()

  // if edit_ai_id is found, load the AI
  useEffect(() => {
    if (edit_ai_id) {
      _.assign(mem_ai, initial)

      // set all values true
      mem_ai.values_show = _.mapValues(values_show, () => true)

      if (edit_ai_id === "c1") {
        if (
          !confirm(
            "Editing C1 can break Conductor's functionality as Conductor relies C1 to behave a certain way. Are you sure you want to edit C1?",
          )
        ) {
          navigate(`/c/modules`)
        }
      }
      const ai = _.find(ai_state, { id: edit_ai_id })
      if (ai) {
        mem_ai.avatar = ai.meta.avatar || ""
        mem_ai.values = ai.persona
        mem_ai.selected_llm = `${ai.default_llm_module.id}/${ai.default_llm_module.variant_id}`

        navigate(`/c/ai/edit/${ai.id}`)
      }
    } else {
      _.assign(mem_ai, initial)
      // navigate(`/c/ai/`)
    }
  }, [edit_ai_id])

  const setExample = useCallback((example: any) => {
    const e = _.get(examples, example.value)
    if (e) mem_ai.values = { ...e }
  }, [])

  const importAI = useCallback((ai: any) => {
    const AI = PersonaS.safeParse(ai)
    if (AI.success) {
      mem_ai.values = AI.data
    }
  }, [])

  const element_class =
    "flex flex-1 flex-col rounded-xl bg-zinc-900 bg-gradient-to-br from-zinc-700/30 to-zinc-600/30 justify-start p-4 mb-3 border-2 border-zinc-900"
  const headline_class = "flex flex-1 text-sm font-semibold text-zinc-300"
  const input =
    "flex flex-1 w-full p-0 mt-3 bg-zinc-700/30 p-2  rounded placeholder-zinc-400 text-zinc-300 outline-none focus:outline-none ring-0 shadow-transparent border-2 border-zinc-900/50"
  const textarea = "p-0 border-0 font-semibold text-xs"

  const AI = useCallback(
    ({ value_name }: { value_name?: string }) => (
      <div className="flex flex-1 justify-end hidden">
        <div
          className="tooltip tooltip-top"
          data-tip={`Generate ${
            value_name?.toLowerCase() || "value"
          } based on\nthe information you have already filled in`}
        >
          <img
            src={AIIcon}
            className="w-5 h-5 saturate-0 hover:saturate-100 cursor-pointer"
          />
        </div>
      </div>
    ),
    [],
  )

  const processValues = () => {
    if (!mem_ai.selected_llm)
      return error({ message: "Please select a default LLM model" })

    const llm_module = _.find(
      user_state.modules.installed,
      (mod) => mod.id === mem_ai.selected_llm.split("/")[0],
    )
    const llm_variant = _.find(
      llm_module?.meta.variants,
      (variant) => variant.id === mem_ai.selected_llm.split("/")[1],
    )
    const default_llm_module: LLMModuleT = {
      _v: 1,
      id: llm_module?.id || config.defaults.llm_module.id,
      variant_id: llm_variant?.id || config.defaults.llm_module.variant_id,
    }

    const partial_AIS = AIS.pick({ persona: true })
    const per = partial_AIS.safeParse({ persona: values })

    if (per.success) {
      return { persona: per.data?.persona, default_llm_module }
    } else {
      const missing_values = `Please fill in the following fields: ${
        per.error.issues.map((e) => e.path?.[1]).join(", ") || ""
      }`
      return error({ message: missing_values, data: per.error })
    }
  }

  const createPersona = async () => {
    mem_ai.creation_in_process = true
    const dat = processValues()
    if (!dat) return (mem_ai.creation_in_process = false)
    const ai = await AIActions.add({
      meta: {
        avatar: mem_ai.avatar,
      },
      persona: dat.persona,
      default_llm_module: dat.default_llm_module,
    })
    if (!ai) return (mem_ai.creation_in_process = false)
    mem_ai.creation_in_process = false
    emit({
      type: "user.updateAILastUsed",
      data: {
        ai_id: ai.id,
      },
    })
    navigate(`/c/modules`)
  }

  const editPersona = async () => {
    mem_ai.creation_in_process = true
    const dat = processValues()
    if (!dat) return (mem_ai.creation_in_process = false)
    const ai = _.find(ai_state, (ai) => ai.id === edit_ai_id)
    if (!ai) return (mem_ai.creation_in_process = false)
    const updated = _.cloneDeep(ai)
    updated.default_llm_module = dat.default_llm_module
    updated.persona = dat.persona
    await AIActions.update({ ai: updated })
    mem_ai.creation_in_process = false
    navigate(`/c/modules`)
  }

  useEffect(() => {
    fieldFocus({ selector: "#name" })
  }, [])

  const onDrop = (acceptedFiles: any, fileRejections: any) => {
    if (fileRejections.length > 0) {
      fileRejections.map(({ file, errors }: any) => {
        return error({
          message: `File ${file.name} was rejected: ${errors
            .map((e: any) => e.message)
            .join(", ")}`,
          data: errors,
        })
      })
    } else {
      const reader = new FileReader()

      reader.onabort = () => console.log("file reading was aborted")
      reader.onerror = () => console.log("file reading has failed")
      reader.onload = () => {
        // Do whatever you want with the file contents
        const data_url = reader.result as string
        if (!data_url) return
        if (edit_ai_id) {
          let ai = _.find(ai_state, (ai) => ai.id === edit_ai_id)
          if (ai) ai = _.set(ai, "meta.avatar", data_url)
          emit({
            type: "ais.update",
            data: {
              ai,
            },
          })
        }
        mem_ai.avatar = data_url
      }
      reader.readAsDataURL(acceptedFiles[0] as any)
    }
  }
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 500000,
    accept: {
      "image/png": [".png", ".jpg", ".jpeg"],
    },
  })

  return (
    <div className="flex flex-1 flex-col items-center bg-[#111]/60 px-[10%] min-h-screen overflow-x-hidden">
      <div className="m-auto max-w-[1200px] w-full gradient-bg p-9 rounded-xl">
        <div className="flex flex-1 flex-row">
          <div className="flex justify-start tracking-tight items-center mb-4 text-zinc-200 text-8xl font-bold ">
            AI Creator
          </div>
          <div
            className={`flex flex-1 justify-end items-end mb-4 gap-2 ${
              edit_ai_id && "hidden"
            }`}
          >
            <button
              className={
                "flex flex-row justify-center items-center bg-zinc-800/30 hover:bg-zinc-900/70 border border-zinc-700 border-t-zinc-600/70 rounded-md py-2 px-4 cursor-pointer text-zinc-500 hover:text-zinc-200 text-xs font-semibold transition-all h-[38px]"
              }
              onClick={() => {
                // open import AI modal
                const importAiDialog = document.getElementById(
                  "import-ai",
                ) as HTMLDialogElement
                importAiDialog?.showModal()
              }}
            >
              Import AI
            </button>
            <Select
              className="react-select-container w-[200px]"
              classNamePrefix="react-select"
              onChange={setExample}
              placeholder="Load an example"
              options={Object.keys(examples).map((example) => {
                return { value: example, label: example }
              })}
            ></Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 w-full ">
          <div className="col-span-1">
            <div className={element_class}>
              <div
                {...getRootProps()}
                className="relative cursor-pointer flex flex-shrink-0 gap-3 items-end mb-3 p-3 justify-end w-full h-full aspect-square rounded-3xl overflow-hidden border-zinc-700/80 border-0 border-dashed text-zinc-600 bg-gradient-to-br from-zinc-800/30 to-zinc-700/30"
              >
                <img
                  src={mem_ai.avatar || getAvatar({ seed: values.name })}
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    right: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                  }}
                />
                <input {...getInputProps()} />
                <div className="flex absolute z-100 w-10 h-10 bg-zinc-900/80 border border-zinc-900/10 justify-center items-center rounded-xl">
                  <MdOutlineAddAPhoto className="absolute opacity-80 hover:opacity-100 text-zinc-200 w-5 h-5 cursor-pointer" />
                </div>
                {/* <div className="flex aspect-square w-10 bg-zinc-700/30 border border-zinc-600/20 justify-center items-center rounded-xl">
                  <img src={AIIcon} className="w-8 h-8 saturate-0 hover:saturate-100 cursor-pointer" />
                </div> */}
              </div>
              <div className="flex flex-1 flex-grow w-full flex-shrink-0 text-lg font-semibold text-zinc-200 items-center">
                Name{" "}
                <span className="flex items-center ml-2 text-[10px] font-medium mr-2 px-2.5 py-0 max-h-5 rounded-full bg-green-700 text-gray-300">
                  required
                </span>
                {/* <AI value_name="Name" /> */}
              </div>
              <div className={input + " -mt-0"}>
                <RichTextarea
                  id="name"
                  rows={1}
                  autoHeight
                  placeholder="What do you call this AI? (e.g. 'Researcher Raymond')"
                  style={{ width: "100%", resize: "none" }}
                  value={name}
                  onChange={(e) => {
                    mem_ai.values.name = e.target.value
                    set_name(e.target.value)
                  }}
                  className={textarea}
                />
              </div>
            </div>
            <div className={element_class}>
              <div className={headline_class + " mb-3"}>
                Default reasoning engine{" "}
                <span className="max-h-5 ml-2 text-[10px] font-medium mr-2 px-2.5 rounded-full bg-green-700 text-gray-300">
                  required
                </span>
              </div>
              <Select
                isSearchable={true}
                className="react-select-container"
                classNamePrefix="react-select"
                value={{
                  id: selected_llm || config.defaults.llm_module.id,
                  value:
                    selected_llm ||
                    `${config.defaults.llm_module.id}/${config.defaults.llm_module.variant_id}`,
                  label:
                    `${_.find(
                      user_state.modules.installed,
                      (mod) => mod.id === selected_llm?.split("/")[0],
                    )?.meta.name} / ${_.find(
                      user_state.modules.installed,
                      (mod) => mod.id === selected_llm?.split("/")[0],
                    )?.meta.variants?.find(
                      (v) => v.id === selected_llm?.split("/")[1],
                    )?.name}` || "Unified LLM Engine / GPT-4",
                }}
                onChange={(e: any) => {
                  mem_ai.selected_llm = e.value
                }}
                options={generate_llm_module_options({
                  user_state,
                  selected: ``,
                  include_limits: false,
                  return_as_object: true,
                })}
              />
            </div>
          </div>
          <div className="col-span-2">
            <div className={element_class}>
              <div className={headline_class}>
                Description{" "}
                <span className="ml-2 text-[10px] font-medium mr-2 px-2.5 rounded-full bg-green-700 text-gray-300">
                  required
                </span>
                {/* <AI value_name="Description" /> */}
              </div>
              <div className={input}>
                <RichTextarea
                  rows={2}
                  autoHeight
                  placeholder={`Describe who ${
                    values["name"] || "Researcher Raymond"
                  } is in a few sentences. (e.g. '${
                    values["name"] || "Researcher Raymond"
                  } is a world class researcher at the University of Oxford who is passionate about health and fitness')`}
                  style={{ width: "100%", resize: "none" }}
                  value={description}
                  onChange={(e) => {
                    mem_ai.values = { ...values, description: e.target.value }
                    set_description(e.target.value)
                  }}
                  className={textarea}
                />
              </div>
            </div>
            <div className={element_class}>
              <div className={headline_class}>
                <div
                  className={headline_class + " cursor-pointer"}
                  onClick={() =>
                    (mem_ai.values_show = {
                      ...values_show,
                      audience: !values_show["audience"],
                    })
                  }
                >
                  <div className="flex flex-col mr-1 justify-center items-center">
                    {values_show["audience"] ?
                      <MdOutlineKeyboardArrowDown />
                    : <MdOutlineKeyboardArrowRight />}
                  </div>
                  Audience{" "}
                  <span className="ml-2 text-[10px] font-medium mr-2 px-2.5 rounded-full bg-gray-700 text-gray-300">
                    optional | use to guide AI's writing level
                  </span>
                  {/* <AI value_name="Audience" /> */}
                </div>
              </div>
              <div className={`${!values_show["audience"] && "hidden"}`}>
                <div className={input}>
                  <RichTextarea
                    rows={2}
                    autoHeight
                    placeholder={`Who is ${
                      values["name"] || "Researcher Raymond"
                    } talking to? (e.g. 'university students', 'health enthusiasts')`}
                    style={{ width: "100%", resize: "none" }}
                    value={audience || ""}
                    onChange={(e) => {
                      mem_ai.values = { ...values, audience: e.target.value }
                      set_audience(e.target.value)
                    }}
                    className={textarea}
                  />
                </div>
              </div>
            </div>
            {/* <div className={element_class}>
              <div className={headline_class}>
                <div
                  className={headline_class + " cursor-pointer"}
                  onClick={() =>
                    (mem_ai.values_show = {
                      ...values_show,
                      background: !values_show["background"],
                    })
                  }
                >
                  <div className="flex flex-col mr-1 justify-center items-center">
                    {values_show["background"] ?
                      <MdOutlineKeyboardArrowDown />
                    : <MdOutlineKeyboardArrowRight />}
                  </div>
                  Background{" "}
                  <span className="ml-2 text-[10px] font-medium mr-2 px-2.5 rounded-full bg-gray-700 text-gray-300">
                    optional but improves results
                  </span>
                  <AI value_name="Background" />
                </div>
              </div>
              <div className={`${!values_show["background"] && "hidden"}`}>
                <div className={input}>
                  <RichTextarea
                    rows={2}
                    autoHeight
                    placeholder={`What is ${
                      (values["name"] && values["name"] + "'s") ||
                      "Researcher Raymond's"
                    } history? This can help give AI some "flavor" to answer more accurately. (e.g. '${
                      values["name"] || "Researcher Raymond"
                    } has a PhD in biochemistry and has published over 100 papers in the field of health and fitness')`}
                    style={{ width: "100%", resize: "none" }}
                    value={values["background"] || ""}
                    onChange={(e) =>
                      (mem_ai.values = {
                        ...values,
                        background: e.target.value,
                      })
                    }
                    className={textarea}
                  />
                </div>
              </div>
            </div> */}
            <div className={element_class}>
              <div className={headline_class}>
                <div
                  className={headline_class + " cursor-pointer"}
                  onClick={() =>
                    (mem_ai.values_show = {
                      ...values_show,
                      styles: !values_show["styles"],
                    })
                  }
                >
                  <div className="flex flex-col mr-1 justify-center items-center">
                    {values_show["styles"] ?
                      <MdOutlineKeyboardArrowDown />
                    : <MdOutlineKeyboardArrowRight />}
                  </div>
                  Communication style{" "}
                  <span className="ml-2 text-[10px] font-medium mr-2 px-2.5 rounded-full bg-gray-700 text-gray-300">
                    optional | use to guide AI's writing style
                  </span>
                  <AI value_name="Communication style" />
                </div>
              </div>
              <div className={`${!values_show["styles"] && "hidden"}`}>
                {values["styles"]?.map((trait, index) => {
                  return (
                    <div className={input} key={`styles-${index}`}>
                      <RichTextarea
                        rows={2}
                        autoHeight
                        placeholder={`What's ${
                          (values["name"] && values["name"] + "'s") ||
                          "Researcher Raymond's"
                        } communication style? (e.g. '${
                          values["name"] || "Researcher Raymond"
                        } is very informal, friendly, patient, and simplifies scientific jargon to laymen terms')`}
                        style={{ width: "100%", resize: "none" }}
                        value={styles?.[index] || ""}
                        onChange={(e) => {
                          mem_ai.values = {
                            ...values,
                            styles: values["styles"]?.map((t, i) =>
                              i === index ? e.target.value : t,
                            ),
                          }
                          set_styles(
                            values["styles"]?.map((t, i) =>
                              i === index ? e.target.value : t,
                            ) as string[],
                          )
                        }}
                        className={textarea}
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={element_class}>
              <div
                className={headline_class + " cursor-pointer"}
                onClick={() => {
                  mem_ai.values_show = {
                    ...values_show,
                    traits: !values_show["traits"],
                  }
                }}
              >
                <div className="flex flex-col mr-1 justify-center items-center">
                  {values_show["traits"] ?
                    <MdOutlineKeyboardArrowDown />
                  : <MdOutlineKeyboardArrowRight />}
                </div>
                Traits and skills{" "}
                <span className="ml-2 text-[10px] font-medium mr-2 px-2.5 rounded-full bg-gray-700 text-gray-300">
                  optional | use to guide AI's behavior
                </span>{" "}
                <AI value_name="Traits and skills" />
              </div>
              <div className={`${!values_show["traits"] && "hidden"}`}>
                {values["traits"]?.map((trait, index) => {
                  return (
                    <div className="flex mb-3" key={`traits-${index}`}>
                      <div className={input}>
                        <RichTextarea
                          rows={1}
                          autoHeight
                          placeholder={`What are ${
                            (values["name"] && values["name"] + "'s") ||
                            "Researcher Raymond's"
                          } traits and skills? (e.g. 'expert at reading academic papers')`}
                          style={{ width: "100%", resize: "none" }}
                          value={traits?.[index]?.skill || ""}
                          onChange={(e) => {
                            mem_ai.values = {
                              ...values,
                              traits: values["traits"]?.map((t, i) => {
                                if (i === index && t) {
                                  return {
                                    ...t,
                                    skill: e.target.value || "",
                                    value: 1,
                                  }
                                } else return t
                              }) as { skill: string; value: number }[],
                            }
                            set_traits(
                              values["traits"]?.map((t, i) => {
                                if (i === index && t) {
                                  return {
                                    ...t,
                                    skill: e.target.value || "",
                                    value: 1,
                                  }
                                } else return t
                              }) as { skill: string; value: number }[],
                            )
                          }}
                          className={textarea}
                        />
                      </div>
                      <div
                        className="flex flex-col justify-center ml-4 mt-2.5 items-center tooltip tooltip-left cursor-pointer"
                        data-tip="Delete trait or skill"
                        onClick={() => {
                          // delete traits
                          mem_ai.values = {
                            ...values,
                            traits: values["traits"]?.filter(
                              (_, i) => i !== index,
                            ),
                          }
                          set_traits(
                            values["traits"]?.filter((_, i) => i !== index) as {
                              skill: string
                              value: number
                            }[],
                          )
                        }}
                      >
                        <RiAddCircleFill className="rotate-45 w-3 text-zinc-500 hover:text-red-400" />
                      </div>
                    </div>
                  )
                })}
                <div className="flex flex-row flex-1 justify-center items-center mt-2">
                  <div className="flex flex-1 h-[1px] bg-zinc-700/40"></div>
                  <div
                    className="flex mx-1 text-zinc-400 hover:text-zinc-200 tooltip tooltip-top cursor-pointer"
                    data-tip="Add another trait or skill"
                    onClick={() => {
                      mem_ai.values = {
                        ...values,
                        traits: [
                          ...(values["traits"] || []),
                          { skill: "", value: 0 },
                        ],
                      }
                      set_traits([
                        ...(values["traits"] || []),
                        { skill: "", value: 0 },
                      ] as { skill: string; value: number }[])
                    }}
                  >
                    <RiAddCircleFill />
                  </div>
                  <div className="flex flex-1 h-[1px] bg-zinc-700/40"></div>
                </div>
              </div>
            </div>
            <div className={element_class}>
              <div className={headline_class}>
                <div
                  className={headline_class + " cursor-pointer"}
                  onClick={() =>
                    (mem_ai.values_show = {
                      ...values_show,
                      responsibilities: !values_show["responsibilities"],
                    })
                  }
                >
                  <div className="flex flex-col mr-1 justify-center items-center">
                    {values_show["responsibilities"] ?
                      <MdOutlineKeyboardArrowDown />
                    : <MdOutlineKeyboardArrowRight />}
                  </div>
                  Tasks{" "}
                  <span className="ml-2 text-[10px] font-medium mr-2 px-2.5 rounded-full bg-gray-700 text-gray-300">
                    optional | use to narrow down what tasks the AI should focus
                    on
                  </span>
                  <AI value_name="Responsibilities" />
                </div>
              </div>
              <div
                className={`${!values_show["responsibilities"] && "hidden"}`}
              >
                {values["responsibilities"]?.map((trait, index) => {
                  return (
                    <div
                      className="flex mb-3"
                      key={`responsibilities-${index}`}
                    >
                      <div className={input}>
                        <RichTextarea
                          rows={1}
                          autoHeight
                          placeholder={`What tasks ${
                            values["name"] || "Researcher Raymond"
                          } should focus on? (e.g. '${
                            values["name"] || "Researcher Raymond"
                          } should always suggest follow up questions.')`}
                          style={{ width: "100%", resize: "none" }}
                          value={responsibilities?.[index] || ""}
                          onChange={(e) => {
                            mem_ai.values = {
                              ...values,
                              responsibilities: values["responsibilities"]?.map(
                                (t, i) => (i === index ? e.target.value : t),
                              ),
                            }
                            set_responsibilities(
                              values["responsibilities"]?.map((t, i) =>
                                i === index ? e.target.value : t,
                              ) as string[],
                            )
                          }}
                          className={textarea}
                        />
                      </div>
                      <div
                        className="flex flex-col justify-center ml-4 mt-2.5 items-center tooltip tooltip-left cursor-pointer"
                        data-tip="Delete responsibility"
                        onClick={() => {
                          // delete responsibility
                          mem_ai.values = {
                            ...values,
                            responsibilities: values[
                              "responsibilities"
                            ]?.filter((_, i) => i !== index),
                          }
                          set_responsibilities(
                            values["responsibilities"]?.filter(
                              (_, i) => i !== index,
                            ) as string[],
                          )
                        }}
                      >
                        <RiAddCircleFill className="rotate-45 w-3 text-zinc-500 hover:text-red-400" />
                      </div>
                    </div>
                  )
                })}

                <div className="flex flex-row flex-1 justify-center items-center mt-2">
                  <div className="flex flex-1 h-[1px] bg-zinc-700/40"></div>
                  <div
                    className="flex mx-1 text-zinc-400 hover:text-zinc-200 tooltip tooltip-top cursor-pointer"
                    data-tip="Add another responsibility"
                    onClick={() => {
                      // add responsibility
                      mem_ai.values = {
                        ...values,
                        responsibilities: [
                          ...(values["responsibilities"] || []),
                          "",
                        ],
                      }
                      set_responsibilities([
                        ...(values["responsibilities"] || []),
                        "",
                      ] as string[])
                    }}
                  >
                    <RiAddCircleFill />
                  </div>
                  <div className="flex flex-1 h-[1px] bg-zinc-700/40"></div>
                </div>
              </div>
            </div>
            {/* <div className={element_class}>
              <div className={headline_class}>
                <div
                  className={headline_class + " cursor-pointer"}
                  onClick={() =>
                    (mem_ai.values_show = {
                      ...values_show,
                      welcome_message: !values_show["welcome_message"],
                    })
                  }
                >
                  <div className="flex flex-col mr-1 justify-center items-center">
                    {values_show["welcome_message"] ?
                      <MdOutlineKeyboardArrowDown />
                    : <MdOutlineKeyboardArrowRight />}
                  </div>
                  Introduction message{" "}
                  <span className="ml-2 text-[10px] font-medium mr-2 px-2.5 rounded-full bg-gray-700 text-gray-300">
                    optional | use to introduce the AI and to start the
                    conversation
                  </span>
                  <AI value_name="Introduction message" />
                </div>
              </div>
              <div className={`${!values_show["welcome_message"] && "hidden"}`}>
                <div className={input}>
                  <RichTextarea
                    rows={2}
                    autoHeight
                    placeholder={`Write AI's first message to the user. This should help to start the conversation. (e.g. 'Hey, I'm ${
                      (values["name"] && values["name"]) || "Researcher Raymond"
                    }! I can help you research any topic or material you might have!')`}
                    style={{ width: "100%", resize: "none" }}
                    value={values["welcome_message"] || ""}
                    onChange={(e) =>
                      (mem_ai.values = {
                        ...values,
                        welcome_message: e.target.value,
                      })
                    }
                    className={textarea}
                  />
                </div>
              </div>
            </div> */}
            <div className={element_class}>
              <div className={headline_class}>
                <div
                  className={headline_class + " cursor-pointer"}
                  onClick={() =>
                    (mem_ai.values_show = {
                      ...values_show,
                      prompt_suggestions: !values_show["prompt_suggestions"],
                    })
                  }
                >
                  <div className="flex flex-col mr-1 justify-center items-center">
                    {values_show["prompt_suggestions"] ?
                      <MdOutlineKeyboardArrowDown />
                    : <MdOutlineKeyboardArrowRight />}
                  </div>
                  Prompt suggestions{" "}
                  <span className="ml-2 text-[10px] font-medium mr-2 px-2.5 rounded-full bg-gray-700 text-gray-300">
                    optional | help user to understand what this AI can do
                  </span>
                  <AI value_name="prompt_suggestions" />
                </div>
              </div>
              <div
                className={`${!values_show["prompt_suggestions"] && "hidden"}`}
              >
                {values["prompt_suggestions"]?.map((trait, index) => {
                  return (
                    <div
                      className="flex mb-3"
                      key={`prompt_suggestions-${index}`}
                    >
                      <div className={input}>
                        <RichTextarea
                          rows={1}
                          autoHeight
                          placeholder={`What are the key learnings in the document?`}
                          style={{ width: "100%", resize: "none" }}
                          value={prompt_suggestions?.[index] || ""}
                          onChange={(e) => {
                            mem_ai.values = {
                              ...values,
                              prompt_suggestions: values[
                                "prompt_suggestions"
                              ]?.map((t, i) =>
                                i === index ? e.target.value : t,
                              ),
                            }
                            set_prompt_suggestions(
                              values["prompt_suggestions"]?.map((t, i) =>
                                i === index ? e.target.value : t,
                              ) as string[],
                            )
                          }}
                          className={textarea}
                        />
                      </div>
                      <div
                        className="flex flex-col justify-center ml-4 mt-2.5 items-center tooltip tooltip-left cursor-pointer"
                        data-tip="Delete responsibility"
                        onClick={() => {
                          // delete
                          mem_ai.values = {
                            ...values,
                            prompt_suggestions: values[
                              "prompt_suggestions"
                            ]?.filter((_, i) => i !== index),
                          }
                          set_prompt_suggestions(
                            values["prompt_suggestions"]?.filter(
                              (_, i) => i !== index,
                            ) as string[],
                          )
                        }}
                      >
                        <RiAddCircleFill className="rotate-45 w-3 text-zinc-500 hover:text-red-400" />
                      </div>
                    </div>
                  )
                })}

                <div className="flex flex-row flex-1 justify-center items-center mt-2">
                  <div className="flex flex-1 h-[1px] bg-zinc-700/40"></div>
                  <div
                    className="flex mx-1 text-zinc-400 hover:text-zinc-200 tooltip tooltip-top cursor-pointer"
                    data-tip="Add another suggestion"
                    onClick={() => {
                      // add
                      mem_ai.values = {
                        ...values,
                        prompt_suggestions: [
                          ...(values["prompt_suggestions"] || []),
                          "",
                        ],
                      }
                      set_prompt_suggestions([
                        ...(values["prompt_suggestions"] || []),
                        "",
                      ] as string[])
                    }}
                  >
                    <RiAddCircleFill />
                  </div>
                  <div className="flex flex-1 h-[1px] bg-zinc-700/40"></div>
                </div>
              </div>
            </div>
            <div className={element_class}>
              <div className={headline_class}>
                <div
                  className={headline_class + " cursor-pointer"}
                  onClick={() =>
                    (mem_ai.values_show = {
                      ...values_show,
                      limitations: !values_show["limitations"],
                    })
                  }
                >
                  <div className="flex flex-col mr-1 justify-center items-center">
                    {values_show["limitations"] ?
                      <MdOutlineKeyboardArrowDown />
                    : <MdOutlineKeyboardArrowRight />}
                  </div>
                  Limitations{" "}
                  <span className="ml-2 text-[10px] font-medium mr-2 px-2.5 rounded-full bg-gray-700 text-gray-300">
                    optional | use to limit AI's behavior
                  </span>
                  <AI value_name="Limitations" />
                </div>
              </div>
              <div className={`${!values_show["limitations"] && "hidden"}`}>
                {values["limitations"]?.map((trait, index) => {
                  return (
                    <div className="flex mb-3" key={`limitations-${index}`}>
                      <div className={input}>
                        <RichTextarea
                          rows={1}
                          autoHeight
                          placeholder={`What can't ${
                            values["name"] || "Researcher Raymond"
                          } do? (e.g. '${
                            values["name"] || "Researcher Raymond"
                          } can't tell lies')`}
                          style={{ width: "100%", resize: "none" }}
                          value={limitations?.[index] || ""}
                          onChange={(e) => {
                            mem_ai.values = {
                              ...values,
                              limitations: values["limitations"]?.map((t, i) =>
                                i === index ? e.target.value : t,
                              ),
                            }
                            set_limitations(
                              values["limitations"]?.map((t, i) =>
                                i === index ? e.target.value : t,
                              ) as string[],
                            )
                          }}
                          className={textarea}
                        />
                      </div>
                      <div
                        className="flex flex-col justify-center ml-4 mt-2.5 items-center tooltip tooltip-left cursor-pointer"
                        data-tip="Delete limitation"
                        onClick={() => {
                          // delete limitations
                          mem_ai.values = {
                            ...values,
                            limitations: values["limitations"]?.filter(
                              (_, i) => i !== index,
                            ),
                          }
                          set_limitations(
                            values["limitations"]?.filter(
                              (_, i) => i !== index,
                            ) as string[],
                          )
                        }}
                      >
                        <RiAddCircleFill className="rotate-45 w-3 text-zinc-500 hover:text-red-400" />
                      </div>
                    </div>
                  )
                })}
                <div className="flex flex-row flex-1 justify-center items-center mt-2">
                  <div className="flex flex-1 h-[1px] bg-zinc-700/40"></div>
                  <div
                    className="flex mx-1 text-zinc-400 hover:text-zinc-200 tooltip tooltip-top cursor-pointer"
                    data-tip="Add another limitation"
                    onClick={() => {
                      mem_ai.values = {
                        ...values,
                        limitations: [...(values["limitations"] || []), ""],
                      }
                      set_limitations([
                        ...(values["limitations"] || []),
                        "",
                      ] as string[])
                    }}
                  >
                    <RiAddCircleFill />
                  </div>
                  <div className="flex flex-1 h-[1px] bg-zinc-700/40"></div>
                </div>
              </div>
            </div>
            <div className={element_class}>
              <div className={headline_class}>
                <div
                  className={headline_class + " cursor-pointer"}
                  onClick={() =>
                    (mem_ai.values_show = {
                      ...values_show,
                      response_examples: !values_show["response_examples"],
                    })
                  }
                >
                  <div className="flex flex-col mr-1 justify-center items-center">
                    {values_show["response_examples"] ?
                      <MdOutlineKeyboardArrowDown />
                    : <MdOutlineKeyboardArrowRight />}
                  </div>
                  Response examples
                  <span className="ml-2 text-[10px] font-medium mr-2 px-2.5 rounded-full bg-gray-700 text-gray-300">
                    optional | use to show AI how it should response
                  </span>
                  <AI value_name="response examples" />
                </div>
              </div>
              <div
                className={`${!values_show["response_examples"] && "hidden"}`}
              >
                {values["response_examples"]?.map((example, index) => {
                  return (
                    <div
                      className="flex flex-row flex-1 gap-4 mt-3"
                      key={`response_examples-${index}`}
                    >
                      <div className="flex flex-col flex-1">
                        <div className="flex flex-row text-xs font-semibold text-zinc-500 ml-1 mb-1">
                          Message
                        </div>
                        <div className={input + " -mt-1 flex-grow-0"}>
                          <RichTextarea
                            rows={2}
                            placeholder="When user says... (e.g. 'Explain mitochondria')"
                            style={{ width: "100%" }}
                            value={
                              values["response_examples"]?.[index]?.[
                                "message"
                              ] || ""
                            }
                            onChange={(e) => {
                              mem_ai.values = {
                                ...values,
                                response_examples: values[
                                  "response_examples"
                                ]?.map((t, i) => {
                                  if (i === index && t) {
                                    return {
                                      ...t,
                                      message: e.target.value || "",
                                    }
                                  } else return t
                                }) as { message: string; response: string }[],
                              }
                              set_response_examples(
                                values["response_examples"]?.map((t, i) => {
                                  if (i === index && t) {
                                    return {
                                      ...t,
                                      message: e.target.value || "",
                                    }
                                  } else return t
                                }) as { message: string; response: string }[],
                              )
                            }}
                            className={textarea}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col flex-1">
                        <div className="flex flex-row text-xs font-semibold text-zinc-500 ml-1 mb-1">
                          Response
                        </div>
                        <div className={input + " -mt-1 flex-grow-0"}>
                          <RichTextarea
                            rows={2}
                            placeholder={`${
                              values["name"] || "Researcher Raymond"
                            } should respond... (e.g. 'Mitochondria are organelles within cells that ...')`}
                            style={{ width: "100%" }}
                            value={
                              values["response_examples"]?.[index]?.[
                                "response"
                              ] || ""
                            }
                            onChange={(e) => {
                              mem_ai.values = {
                                ...values,
                                response_examples: values[
                                  "response_examples"
                                ]?.map((t, i) => {
                                  if (i === index && t) {
                                    return {
                                      ...t,
                                      response: e.target.value || "",
                                    }
                                  } else return t
                                }) as { message: string; response: string }[],
                              }
                              set_response_examples(
                                values["response_examples"]?.map((t, i) => {
                                  if (i === index && t) {
                                    return {
                                      ...t,
                                      response: e.target.value || "",
                                    }
                                  } else return t
                                }) as { message: string; response: string }[],
                              )
                            }}
                            className={textarea}
                          />
                        </div>
                      </div>

                      <div
                        className="flex flex-col mt-5 justify-center items-center tooltip tooltip-left cursor-pointer"
                        data-tip="Delete example"
                        onClick={() => {
                          // delete response example
                          mem_ai.values = {
                            ...values,
                            response_examples: values[
                              "response_examples"
                            ]?.filter((_, i) => i !== index),
                          }
                          set_response_examples(
                            values["response_examples"]?.filter(
                              (_, i) => i !== index,
                            ) as { message: string; response: string }[],
                          )
                        }}
                      >
                        <RiAddCircleFill className="rotate-45 w-3 text-zinc-500 hover:text-red-400" />
                      </div>
                    </div>
                  )
                })}

                <div className="flex flex-row flex-1 justify-center items-center mt-2 mr-7">
                  <div className="flex flex-1 h-[1px] bg-zinc-700/40"></div>
                  <div
                    className="flex mx-1 text-zinc-400 hover:text-zinc-200 tooltip tooltip-top cursor-pointer"
                    data-tip="Add another example"
                    onClick={() => {
                      mem_ai.values = {
                        ...values,
                        response_examples: [
                          ...(values["response_examples"] || []),
                          { message: "", response: "" },
                        ],
                      }
                      set_response_examples([
                        ...(values["response_examples"] || []),
                        { message: "", response: "" },
                      ] as { message: string; response: string }[])
                    }}
                  >
                    <RiAddCircleFill />
                  </div>
                  <div className="flex flex-1 h-[1px] bg-zinc-700/40"></div>
                </div>
              </div>
            </div>
            <div className="flex flex-1 gap-3 justify-end">
              {/* <button type="submit" className="p-btn-secondary" onClick={processValues}>
                Have a test chat
              </button> */}
              <button
                type="submit"
                className="p-btn-primary"
                onClick={() => {
                  if (edit_ai_id) editPersona()
                  else createPersona()
                }}
              >
                {!edit_ai_id ? "Create AI" : "Update AI"}
                {creation_in_process ?
                  <div
                    className="float-right w-5 h-5 flex justify-center items-center"
                    role="status"
                  >
                    <svg
                      aria-hidden="true"
                      className="inline w-4 h-4 mr-2 text-white animate-spin fill-[#0B99FF]"
                      viewBox="0 0 100 101"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                        fill="currentColor"
                      />
                      <path
                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                        fill="currentFill"
                      />
                    </svg>
                    <span className="sr-only">Loading...</span>
                  </div>
                : <BiRightArrowAlt className="float-right ml-3 w-5 h-5" />}
              </button>
            </div>
            <div className="flex flex-1 gap-3 justify-end text-xs font-semibold text-zinc-500 mt-2">
              You can always edit the persona later
            </div>
          </div>
        </div>
      </div>
      <dialog
        id="import-ai"
        className="ModuleSetting modal w-full w-max-4xl h-max-[80dvh]"
      >
        <div className="modal-box bg-zinc-800/95 border-t border-t-zinc-600 relative">
          <div className="absolute right-3 top-3">
            <MdClose
              className="cursor-pointer h-3 w-3 text-zinc-300 transition-all hover:text-zinc-100 hover:bg-zinc-700 rounded-full"
              onClick={() => {
                const dialog = document.getElementById(
                  "import-ai",
                ) as HTMLDialogElement
                dialog.close()
              }}
            />
          </div>
          <RichTextarea
            rows={20}
            placeholder={`Paste your AI's JSON here`}
            style={{ width: "100%", background: '#222', color: '#fff' }}
            value={imported_ai_json}
            className="p-0 border border-zinc-700 rounded font-mono text-[10px] p-3"
            onChange={(e) => {
              set_imported_ai_json(e.target.value)
            }}
          />

          <button
            className="p-btn-primary"
            onClick={(e) => {
              try {
                const ai = JSON.parse(imported_ai_json)
                importAI(ai)
                set_imported_ai_json("")
                const dialog = document.getElementById(
                  "import-ai",
                ) as HTMLDialogElement
                dialog.close()
              } catch (e) {
                error({ message: "Invalid JSON" })
              }
            }}
          >
            Import AI
          </button>
        </div>
      </dialog>
    </div>
  )
}
