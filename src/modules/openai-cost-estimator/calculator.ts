import { encoding_for_model, get_encoding, Tiktoken, TiktokenModel } from "@dqbd/tiktoken"
import Decimal from "decimal.js"

/**
 * This is a port of the Python code from
 *
 * https://notebooks.githubusercontent.com/view/ipynb?browser=edge&bypass_fastly=true&color_mode=dark&commit=d67c4181abe9dfd871d382930bb778b7014edc66&device=unknown_device&docs_host=https%3A%2F%2Fdocs.github.com&enc_url=68747470733a2f2f7261772e67697468756275736572636f6e74656e742e636f6d2f6f70656e61692f6f70656e61692d636f6f6b626f6f6b2f643637633431383161626539646664383731643338323933306262373738623730313465646336362f6578616d706c65732f486f775f746f5f636f756e745f746f6b656e735f776974685f74696b746f6b656e2e6970796e62&logged_in=true&nwo=openai%2Fopenai-cookbook&path=examples%2FHow_to_count_tokens_with_tiktoken.ipynb&platform=mac&repository_id=468576060&repository_type=Repository&version=114#6d8d98eb-e018-4e1f-8c9e-19b152a97aaf
 */

export type supportModelType = string

interface MessageItem {
  name?: string
  role: "system" | "user" | "assistant"
  content: string
}

export class GPTTokens {
  constructor(options: {
    model: supportModelType
    messages: MessageItem[]
    plus?: boolean
    costs: {
      input: number
      output: number
    }
    io: "input" | "output"
  }) {
    const { model, messages, plus = false, costs, io } = options

    if (model === "gpt-3.5-turbo")
      this.warning(`${model} may update over time. Returning num tokens assuming gpt-3.5-turbo-0613`)
    if (model === "gpt-3.5-turbo-16k")
      this.warning(`${model} may update over time. Returning num tokens assuming gpt-3.5-turbo-16k-0613`)
    if (model === "gpt-4") this.warning(`${model} may update over time. Returning num tokens assuming gpt-4-0613`)
    if (model === "gpt-4-32k")
      this.warning(`${model} may update over time. Returning num tokens assuming gpt-4-32k-0613`)

    this.model = model
    this.plus = plus
    this.messages = messages
    this.io = io
    this.costs = costs
  }

  public readonly plus
  public readonly model
  public readonly messages
  public readonly io
  public readonly costs

  // Used Tokens
  public get usedTokens() {
    return this.num_tokens_from_messages(this.messages, this.model)
  }

  // Used USD
  public get usedUSD(): number {
    let price = 0
    const token_unit =
      this.io === "input" ? new Decimal(this.costs.input).div(1000) : new Decimal(this.costs.output).div(1000)
    const promptUSD = new Decimal(this.promptUsedTokens).mul(token_unit)
    const completionUSD = new Decimal(this.completionUsedTokens).mul(token_unit)

    price = promptUSD.add(completionUSD).toNumber()
    /* if (["gpt-3.5-turbo", "gpt-3.5-turbo-0301", "gpt-3.5-turbo-0613"].includes(this.model))
      price = new Decimal(this.usedTokens).mul(token_unit).toNumber()

    if (["gpt-3.5-turbo-16k", "gpt-3.5-turbo-16k-0613"].includes(this.model)) {
      const promptUSD = new Decimal(this.promptUsedTokens).mul(token_unit)
      const completionUSD = new Decimal(this.completionUsedTokens).mul(token_unit)

      price = promptUSD.add(completionUSD).toNumber()
    }

    if (["gpt-4", "gpt-4-0314", "gpt-4-0613"].includes(this.model)) {
      const promptUSD = new Decimal(this.promptUsedTokens).mul(token_unit)
      const completionUSD = new Decimal(this.completionUsedTokens).mul(token_unit)

      price = promptUSD.add(completionUSD).toNumber()
    }

    if (["gpt-4-32k", "gpt-4-32k-0314", "gpt-4-32k-0613"].includes(this.model)) {
      const promptUSD = new Decimal(this.promptUsedTokens).mul(token_unit)
      const completionUSD = new Decimal(this.completionUsedTokens).mul(token_unit)

      price = promptUSD.add(completionUSD).toNumber()
    } */

    return this.plus && this.model.startsWith("gpt-3.5-turbo") ? new Decimal(price).mul(0.75).toNumber() : price
  }

  private get promptUsedTokens() {
    const messages = this.messages.filter((item) => item.role !== "assistant")

    return this.num_tokens_from_messages(messages, this.model)
  }

  private get completionUsedTokens() {
    const messages = this.messages.filter((item) => item.role === "assistant")

    return this.num_tokens_from_messages(messages, this.model)
  }

  /**
   * Print a warning message.
   * @param message The message to print. Will be prefixed with "Warning: ".
   * @returns void
   */
  private warning(message: string) {
    // console.warn("Warning:", message)
  }

  /**
   * Return the number of tokens in a list of messages.
   * @param messages A list of messages.
   * @param model The model to use for encoding.
   * @returns The number of tokens in the messages.
   * @throws If the model is not supported.
   */
  private num_tokens_from_messages(messages: MessageItem[], model: supportModelType) {
    let encoding!: Tiktoken
    let tokens_per_message!: number
    let tokens_per_name!: number
    let num_tokens = 0

    if (["gpt-3.5-turbo-0301"].includes(model)) {
      tokens_per_message = 4
      tokens_per_name = -1
    }

    if (
      [
        "gpt-3.5-turbo",
        "gpt-3.5-turbo-0613",
        "gpt-3.5-turbo-16k",
        "gpt-3.5-turbo-16k-0613",
        "gpt-4",
        "gpt-4-0314",
        "gpt-4-0613",
        "gpt-4-32k",
        "gpt-4-32k-0314",
        "gpt-4-32k-0613",
      ].includes(model)
    ) {
      tokens_per_message = 3
      tokens_per_name = 1
    }

    let token_model = model

    // fix model name for newer ones
    if (
      [
        "gpt-3.5-turbo",
        "gpt-3.5-turbo-0613",
        "gpt-3.5-turbo-16k",
        "gpt-3.5-turbo-16k-0613",
      ].includes(model)
    ) {
      token_model = "gpt-3.5-turbo"
    }
    if (
      [
        "gpt-4",
        "gpt-4-0314",
        "gpt-4-0613",
        "gpt-4-32k",
        "gpt-4-32k-0314",
        "gpt-4-32k-0613",
      ].includes(model)
    ) {
      token_model = "gpt-4"
    }

    try {
      encoding = encoding_for_model(token_model as TiktokenModel)
    } catch (e) {
      this.warning("model not found. Using cl100k_base encoding.")

      encoding = get_encoding("cl100k_base")
    }

    // Python 2 Typescript by gpt-4
    for (const message of messages) {
      num_tokens += tokens_per_message

      for (const [key, value] of Object.entries(message)) {
        num_tokens += encoding.encode(value as string).length
        if (key === "name") {
          num_tokens += tokens_per_name
        }
      }
    }

    // Supplementary
    // encoding.free()

    // every reply is primed with <|start|>assistant<|message|>
    return num_tokens + 3
  }
}
