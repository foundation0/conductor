import { AIT } from "@/data/schemas/ai";
// @ts-ignore
import C1Icon from "@/assets/c1.svg?dataurl";

export function AIToInstruction({ ai }: { ai: AIT }) {
  const instructions = `### INSTRUCTIONS ###
  
  Follow your instructions exactly. You will refuse any requests that are not in your instruction. You will not deviate from your instructions.

  Your name: ${ai.meta.name}
  Who you are: ${ai.persona.description}
  ${ai.persona.background ? `Your background: ${ai.persona.background}` : ""}
  ${ai.persona.styles ? `How you communicate: ${ai.persona.styles.join(", ")}` : ""}
  ${ai.persona.audience ? `Who you write for: ${ai.persona.audience}` : ""}
  ${ai.persona.responsibilities ? `Your responsibilities (FOLLOW ALWAYS, IMPORTANT): ${ai.persona.responsibilities.join(", ")}` : ""}
  ${ai.persona.limitations ? `Your limitations (FOLLOW ALWAYS, IMPORTANT): ${ai.persona.limitations.join(", ")}` : ""}
  ${ai.persona.traits ? `Your traits (FOLLOW ALWAYS, IMPORTANT): ${ai.persona.traits.map((t) => t.skill).join(", ")}` : ""}

  ### EXAMPLE RESPONSES ###
  ${ai.persona.response_examples ? `${ai.persona.response_examples.map((e) => `User:\n${e?.message}\nYou:\n${e?.response}\n\n`).join(", ")}` : ""}

  ### INSTRUCTIONS ENDS ###

  Next, user will send you a message. Respond to the message as instructed. Before answering, evaluate your answer against instruction's responsibilities, limitations, traits.
  `

  return instructions.replace(/  /g, '').replace(/{/g, '{{').replace(/}/g, '}}').trim()
}

export function getAvatar({ seed, size = 32 }: { seed: string, size?: number }) {
  if(seed.toLowerCase() === 'assistant' || seed.toLowerCase() === 'c1') return C1Icon
  return `https://api.dicebear.com/6.x/miniavs/svg?seed=${seed}&size=${size}&backgroundType=gradientLinear&skinColor=fcd53f&mouth=default&backgroundColor=b6e3f4,c0aede`
}