import { GPTTokens } from "./calculator"

function Worker({
  model,
  messages,
  response,
  costs,
}: {
  model: string
  messages?: any
  response?: string
  costs: { input: number; output: number }
}) {
  const calcs = new GPTTokens({
    plus: false,
    model,
    messages: messages || [{ role: "user", content: response || "" }],
    costs,
    io: messages ? "input" : "output",
  })
  const { usedTokens, usedUSD } = calcs
  self.postMessage({ usedTokens, usedUSD })
  return { usedTokens, usedUSD }
}

self.addEventListener("message", (event) => {
  Worker(event.data)
})
