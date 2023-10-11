import { UserT } from "@/data/loaders/user"
import { useCallback, useEffect, useState } from "react"
import { BiRightArrowAlt } from "react-icons/bi"
import { useLoaderData, useNavigate, useParams } from "react-router-dom"
import { RichTextarea } from "rich-textarea"
import generate_llm_module_options from "@/libraries/generate_llm_module_options"
import Select from "react-select"
import AIIcon from "@/assets/icons/ai.svg"
import { RiAddCircleFill } from "react-icons/ri"
import { MdOutlineKeyboardArrowDown, MdOutlineKeyboardArrowRight } from "react-icons/md"
import { AIS, AIT, AIsT, LLMModuleT } from "@/data/schemas/ai"
import { fieldFocus } from "@/libraries/field_focus"
import _ from "lodash"
import { error } from "@/libraries/logging"
import AIActions from "@/data/actions/ai"
import { getAvatar } from "@/libraries/ai"
import config from "@/config"

export default function CreatePersona() {
  const { user_state, ai_state } = useLoaderData() as { user_state: UserT; ai_state: AIsT }
  const [creation_in_process, setCreationInProgress] = useState<boolean>(false)
  const [selected_llm, setSelectedLLM] = useState<string | null>(`${config.defaults.llm_module.id}/${config.defaults.llm_module.variant_id}`)

  const [values_show, setValuesShow] = useState({
    description: true,
    audience: false,
    background: false,
    styles: false,
    traits: false,
    responsibilities: false,
    limitations: false,
    response_examples: false,
  })

  const edit_ai_id = useParams().edit_ai_id
  const navigate = useNavigate()

  // if edit_ai_id is found, load the AI
  useEffect(() => {
    if (edit_ai_id) {
      // set all values true
      setValuesShow(_.mapValues(values_show, () => true))

      if (edit_ai_id === "c1") {
        if (
          !confirm(
            "Editing C1 can break Conductor's functionality as Conductor relies C1 to behave a certain way. Are you sure you want to edit C1?"
          )
        ) {
          navigate(`/c/settings`)
        }
      }
      const ai = _.find(ai_state, (ai) => ai.id === edit_ai_id)
      if (ai) {
        setValues(ai.persona)
        setSelectedLLM(`${ai.default_llm_module.id}/${ai.default_llm_module.variant_id}`)
        navigate(`/c/ai/edit/${ai.id}`)
      }
    }
  }, [edit_ai_id])

  const examples = {
    "Mike The Marketer": {
      name: "Marketer Mike",
      description:
        "A digital marketing specialist with a focus on SEO, content marketing, and social media strategies.",
      audience:
        "Business owners, marketing professionals, and anyone interested in improving their digital marketing strategies.",
      background:
        "Over 12 years of experience in the digital marketing field, working with diverse industries from tech startups to established e-commerce businesses.",
      styles: ["Friendly, engaging, enthusiastic, passionate"],
      traits: [
        { skill: "SEO", value: 1 },
        { skill: "Content Marketing", value: 1 },
        { skill: "Social Media Strategies", value: 1 },
      ],
      responsibilities: [
        "Providing advice on SEO strategies",
        "Guiding content marketing efforts",
        "Sharing insights on social media engagement",
        "Analyzing marketing metrics",
        "Staying updated on the latest digital marketing trends",
      ],
      limitations: [
        "Cannot implement strategies directly on your website or social media platforms",
        "Cannot access or analyze proprietary data without permission",
      ],
      response_examples: [
        {
          message: "How can I improve my SEO?",
          response:
            "To improve your SEO, focus on creating high-quality, relevant content that incorporates your target keywords. Also, ensure your website is mobile-friendly, has fast load times, and includes meta tags for better indexing.",
        },
      ],
    },
    Empty: {
      name: "",
      description: "",
      audience: "",
      background: "",
      styles: [""],
      traits: [{ skill: "", value: 0 }],
      responsibilities: [""],
      limitations: [""],
      response_examples: [{ message: "", response: "" }],
    },
  }

  const [values, setValues] = useState<AIT["persona"]>(examples["Empty"])

  const setExample = useCallback((example: any) => {
    const e = _.get(examples, example.value)
    if (e) setValues({ ...e })
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
          <img src={AIIcon} className="w-5 h-5 saturate-0 hover:saturate-100 cursor-pointer" />
        </div>
      </div>
    ),
    []
  )

  const processValues = useCallback(() => {
    if (!selected_llm) return error({ message: "Please select a default LLM model" })

    const llm_module = _.find(user_state.modules.installed, (mod) => mod.id === selected_llm.split("/")[0])
    const llm_variant = _.find(llm_module?.meta.variants, (variant) => variant.id === selected_llm.split("/")[1])
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
  }, [JSON.stringify([values, selected_llm])])

  const createPersona = async () => {
    setCreationInProgress(true)
    const dat = processValues()
    if (!dat) return setCreationInProgress(false)
    const ai = await AIActions.add({ persona: dat.persona, default_llm_module: dat.default_llm_module })
    if (!ai) return setCreationInProgress(false)
    setCreationInProgress(false)
    navigate(`/c/settings`)
  }

  const editPersona = async () => {
    setCreationInProgress(true)
    const dat = processValues()
    if (!dat) return setCreationInProgress(false)
    const ai = _.find(ai_state, (ai) => ai.id === edit_ai_id)
    if (!ai) return setCreationInProgress(false)
    const updated = _.cloneDeep(ai)
    updated.default_llm_module = dat.default_llm_module
    updated.persona = dat.persona
    await AIActions.update({ ai: updated })
    setCreationInProgress(false)
    navigate(`/c/settings`)
  }

  useEffect(() => {
    fieldFocus({ selector: "#name" })
  }, [])

  return (
    <div className="flex flex-1 flex-col items-center bg-[#111]/60 px-[10%] min-h-screen overflow-x-hidden">
      <div className="m-auto max-w-[1200px] w-full gradient-bg p-9 rounded-xl">
        <div className="flex flex-1 flex-row">
          <div className="flex justify-start tracking-tight items-center mb-4 text-zinc-200 text-8xl font-bold ">
            AI Creator
          </div>
          <div className={`flex flex-1 justify-end items-end mb-4 ${edit_ai_id && "hidden"}`}>
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
              <div className="relative flex flex-shrink-0 gap-3 items-end mb-3 p-3 justify-end w-full h-full aspect-square rounded-3xl overflow-hidden border-zinc-700/80 border-0 border-dashed text-zinc-600 bg-gradient-to-br from-zinc-800/30 to-zinc-700/30">
                <img
                  src={getAvatar({ seed: values.name })}
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
                {/* <div className="flex absolute z-100 w-10 h-10 bg-zinc-900/80 border border-zinc-900/20 justify-center items-center rounded-xl">
                  <img src={CameraIcon} className="w-8 h-8  cursor-pointer" />
                </div>
                <div className="flex aspect-square w-10 bg-zinc-700/30 border border-zinc-600/20 justify-center items-center rounded-xl">
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
                  value={values["name"]}
                  onChange={(e) => setValues({ ...values, name: e.target.value })}
                  className={textarea}
                />
              </div>
            </div>
            <div className={element_class}>
              <div className={headline_class + " mb-3"}>
                Default reasoning engine{" "}
                <span className="ml-2 text-[10px] font-medium mr-2 px-2.5 rounded-full bg-green-700 text-gray-300">
                  required
                </span>
              </div>
              <Select
                isSearchable={true}
                className="react-select-container"
                classNamePrefix="react-select"
                value={{
                  id: selected_llm || config.defaults.llm_module.id,
                  value: selected_llm || `${config.defaults.llm_module.id}/${config.defaults.llm_module.variant_id}`,
                  label:
                    `${
                      _.find(user_state.modules.installed, (mod) => mod.id === selected_llm?.split("/")[0])?.meta.name
                    } / ${
                      _.find(
                        user_state.modules.installed,
                        (mod) => mod.id === selected_llm?.split("/")[0]
                      )?.meta.variants?.find((v) => v.id === selected_llm?.split("/")[1])?.name
                    }` || "Unified LLM Engine / GPT-4",
                }}
                onChange={(e: any) => {
                  setSelectedLLM(e.value)
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
                  placeholder={`Describe who ${values["name"] || "Researcher Raymond"} is in a few sentences. (e.g. '${
                    values["name"] || "Researcher Raymond"
                  } is a world class researcher at the University of Oxford who is passionate about health and fitness')`}
                  style={{ width: "100%", resize: "none" }}
                  value={values["description"]}
                  onChange={(e) => setValues({ ...values, description: e.target.value })}
                  className={textarea}
                />
              </div>
            </div>
            <div className={element_class}>
              <div className={headline_class}>
                <div
                  className={headline_class + " cursor-pointer"}
                  onClick={() => setValuesShow({ ...values_show, audience: !values_show["audience"] })}
                >
                  <div className="flex flex-col mr-1 justify-center items-center">
                    {values_show["audience"] ? <MdOutlineKeyboardArrowDown /> : <MdOutlineKeyboardArrowRight />}
                  </div>
                  Audience{" "}
                  <span className="ml-2 text-[10px] font-medium mr-2 px-2.5 rounded-full bg-gray-700 text-gray-300">
                    optional but improves results
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
                    value={values["audience"] || ""}
                    onChange={(e) => setValues({ ...values, audience: e.target.value })}
                    className={textarea}
                  />
                </div>
              </div>
            </div>
            <div className={element_class}>
              <div className={headline_class}>
                <div
                  className={headline_class + " cursor-pointer"}
                  onClick={() => setValuesShow({ ...values_show, background: !values_show["background"] })}
                >
                  <div className="flex flex-col mr-1 justify-center items-center">
                    {values_show["background"] ? <MdOutlineKeyboardArrowDown /> : <MdOutlineKeyboardArrowRight />}
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
                      (values["name"] && values["name"] + "'s") || "Researcher Raymond's"
                    } history? This can help give AI some "flavor" to answer more accurately. (e.g. '${
                      values["name"] || "Researcher Raymond"
                    } has a PhD in biochemistry and has published over 100 papers in the field of health and fitness')`}
                    style={{ width: "100%", resize: "none" }}
                    value={values["background"] || ""}
                    onChange={(e) => setValues({ ...values, background: e.target.value })}
                    className={textarea}
                  />
                </div>
              </div>
            </div>
            <div className={element_class}>
              <div className={headline_class}>
                <div
                  className={headline_class + " cursor-pointer"}
                  onClick={() => setValuesShow({ ...values_show, styles: !values_show["styles"] })}
                >
                  <div className="flex flex-col mr-1 justify-center items-center">
                    {values_show["styles"] ? <MdOutlineKeyboardArrowDown /> : <MdOutlineKeyboardArrowRight />}
                  </div>
                  Communication style{" "}
                  <span className="ml-2 text-[10px] font-medium mr-2 px-2.5 rounded-full bg-gray-700 text-gray-300">
                    optional but improves results
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
                          (values["name"] && values["name"] + "'s") || "Researcher Raymond's"
                        } communication style? (e.g. '${
                          values["name"] || "Researcher Raymond"
                        } is very informal, friendly, patient, and simplifies scientific jargon to laymen terms')`}
                        style={{ width: "100%", resize: "none" }}
                        value={values["styles"]?.[index] || ""}
                        onChange={(e) =>
                          setValues({
                            ...values,
                            styles: values["styles"]?.map((t, i) => (i === index ? e.target.value : t)),
                          })
                        }
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
                onClick={() => setValuesShow({ ...values_show, traits: !values_show["traits"] })}
              >
                <div className="flex flex-col mr-1 justify-center items-center">
                  {values_show["traits"] ? <MdOutlineKeyboardArrowDown /> : <MdOutlineKeyboardArrowRight />}
                </div>
                Traits and skills{" "}
                <span className="ml-2 text-[10px] font-medium mr-2 px-2.5 rounded-full bg-gray-700 text-gray-300">
                  optional but improves results
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
                            (values["name"] && values["name"] + "'s") || "Researcher Raymond's"
                          } traits and skills? (e.g. 'expert at reading academic papers')`}
                          style={{ width: "100%", resize: "none" }}
                          value={values["traits"]?.[index]?.skill || ""}
                          onChange={(e) =>
                            setValues({
                              ...values,
                              traits: values["traits"]?.map((t, i) => {
                                if (i === index && t) {
                                  return { ...t, skill: e.target.value || "", value: 1 }
                                } else return t
                              }) as { skill: string; value: number }[],
                            })
                          }
                          className={textarea}
                        />
                      </div>
                      <div
                        className="flex flex-col justify-center ml-4 mt-2.5 items-center tooltip tooltip-left cursor-pointer"
                        data-tip="Delete trait or skill"
                        onClick={() => {
                          // delete traits
                          setValues({
                            ...values,
                            traits: values["traits"]?.filter((_, i) => i !== index),
                          })
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
                      setValues({
                        ...values,
                        traits: [...(values["traits"] || []), { skill: "", value: 0 }],
                      })
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
                  onClick={() => setValuesShow({ ...values_show, responsibilities: !values_show["responsibilities"] })}
                >
                  <div className="flex flex-col mr-1 justify-center items-center">
                    {values_show["responsibilities"] ? <MdOutlineKeyboardArrowDown /> : <MdOutlineKeyboardArrowRight />}
                  </div>
                  Duties{" "}
                  <span className="ml-2 text-[10px] font-medium mr-2 px-2.5 rounded-full bg-gray-700 text-gray-300">
                    optional but improves results
                  </span>
                  <AI value_name="Responsibilities" />
                </div>
              </div>
              <div className={`${!values_show["responsibilities"] && "hidden"}`}>
                {values["responsibilities"]?.map((trait, index) => {
                  return (
                    <div className="flex mb-3" key={`responsibilities-${index}`}>
                      <div className={input}>
                        <RichTextarea
                          rows={1}
                          autoHeight
                          placeholder={`What should ${values["name"] || "Researcher Raymond"} always do? (e.g. '${
                            values["name"] || "Researcher Raymond"
                          } should always write succinctly and truthfully')`}
                          style={{ width: "100%", resize: "none" }}
                          value={values["responsibilities"]?.[index] || ""}
                          onChange={(e) => {
                            setValues({
                              ...values,
                              responsibilities: values["responsibilities"]?.map((t, i) =>
                                i === index ? e.target.value : t
                              ),
                            })
                          }}
                          className={textarea}
                        />
                      </div>
                      <div
                        className="flex flex-col justify-center ml-4 mt-2.5 items-center tooltip tooltip-left cursor-pointer"
                        data-tip="Delete responsibility"
                        onClick={() => {
                          // delete responsibility
                          setValues({
                            ...values,
                            responsibilities: values["responsibilities"]?.filter((_, i) => i !== index),
                          })
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
                      setValues({
                        ...values,
                        responsibilities: [...(values["responsibilities"] || []), ""],
                      })
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
                  onClick={() => setValuesShow({ ...values_show, limitations: !values_show["limitations"] })}
                >
                  <div className="flex flex-col mr-1 justify-center items-center">
                    {values_show["limitations"] ? <MdOutlineKeyboardArrowDown /> : <MdOutlineKeyboardArrowRight />}
                  </div>
                  Limitations{" "}
                  <span className="ml-2 text-[10px] font-medium mr-2 px-2.5 rounded-full bg-gray-700 text-gray-300">
                    optional but improves results
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
                          placeholder={`What can't ${values["name"] || "Researcher Raymond"} do? (e.g. '${
                            values["name"] || "Researcher Raymond"
                          } can't tell lies')`}
                          style={{ width: "100%", resize: "none" }}
                          value={values["limitations"]?.[index] || ""}
                          onChange={(e) =>
                            setValues({
                              ...values,
                              limitations: values["limitations"]?.map((t, i) => (i === index ? e.target.value : t)),
                            })
                          }
                          className={textarea}
                        />
                      </div>
                      <div
                        className="flex flex-col justify-center ml-4 mt-2.5 items-center tooltip tooltip-left cursor-pointer"
                        data-tip="Delete limitation"
                        onClick={() => {
                          // delete limitations
                          setValues({
                            ...values,
                            limitations: values["limitations"]?.filter((_, i) => i !== index),
                          })
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
                      setValues({
                        ...values,
                        limitations: [...(values["limitations"] || []), ""],
                      })
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
                    setValuesShow({ ...values_show, response_examples: !values_show["response_examples"] })
                  }
                >
                  <div className="flex flex-col mr-1 justify-center items-center">
                    {values_show["response_examples"] ? (
                      <MdOutlineKeyboardArrowDown />
                    ) : (
                      <MdOutlineKeyboardArrowRight />
                    )}
                  </div>
                  Response examples
                  <span className="ml-2 text-[10px] font-medium mr-2 px-2.5 rounded-full bg-gray-700 text-gray-300">
                    optional but improves results
                  </span>
                  <AI value_name="response examples" />
                </div>
              </div>
              <div className={`${!values_show["response_examples"] && "hidden"}`}>
                {values["response_examples"]?.map((example, index) => {
                  return (
                    <div className="flex flex-row flex-1 gap-4 mt-3" key={`response_examples-${index}`}>
                      <div className="flex flex-col flex-1">
                        <div className="flex flex-row text-xs font-semibold text-zinc-500 ml-1 mb-1">Message</div>
                        <div className={input + " -mt-1 flex-grow-0"}>
                          <RichTextarea
                            rows={2}
                            placeholder="When user says... (e.g. 'Explain mitochondria')"
                            style={{ width: "100%" }}
                            value={values["response_examples"]?.[index]?.["message"] || ""}
                            onChange={(e) =>
                              setValues({
                                ...values,
                                response_examples: values["response_examples"]?.map((t, i) => {
                                  if (i === index && t) {
                                    return { ...t, message: e.target.value || "" }
                                  } else return t
                                }) as { message: string; response: string }[],
                              })
                            }
                            className={textarea}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col flex-1">
                        <div className="flex flex-row text-xs font-semibold text-zinc-500 ml-1 mb-1">Response</div>
                        <div className={input + " -mt-1 flex-grow-0"}>
                          <RichTextarea
                            rows={2}
                            placeholder={`${
                              values["name"] || "Researcher Raymond"
                            } should respond... (e.g. 'Mitochondria are organelles within cells that ...')`}
                            style={{ width: "100%" }}
                            value={values["response_examples"]?.[index]?.["response"] || ""}
                            onChange={(e) =>
                              setValues({
                                ...values,
                                response_examples: values["response_examples"]?.map((t, i) => {
                                  if (i === index && t) {
                                    return { ...t, response: e.target.value || "" }
                                  } else return t
                                }) as { message: string; response: string }[],
                              })
                            }
                            className={textarea}
                          />
                        </div>
                      </div>

                      <div
                        className="flex flex-col mt-5 justify-center items-center tooltip tooltip-left cursor-pointer"
                        data-tip="Delete example"
                        onClick={() => {
                          // delete response example
                          setValues({
                            ...values,
                            response_examples: values["response_examples"]?.filter((_, i) => i !== index),
                          })
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
                      setValues({
                        ...values,
                        response_examples: [...(values["response_examples"] || []), { message: "", response: "" }],
                      })
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
                {creation_in_process ? (
                  <div className="float-right w-5 h-5 flex justify-center items-center" role="status">
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
                ) : (
                  <BiRightArrowAlt className="float-right ml-3 w-5 h-5" />
                )}
              </button>
            </div>
            <div className="flex flex-1 gap-3 justify-end text-xs font-semibold text-zinc-500 mt-2">
              You can always edit the persona later
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
