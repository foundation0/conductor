import { AIT } from "@/data/schemas/ai";
// @ts-ignore
import PromptIcon from "@/assets/prompt.svg?dataurl";
// @ts-ignore
import C1Icon from "@/assets/c1.svg?dataurl";

export function AIToInstruction({ ai }: { ai: AIT }) {
  const instructions = `### INSTRUCTIONS ###
  
  You have been assigned a character. You will follow your character exactly. You will refuse any requests that are not in your character. You will not deviate from your character.

  ### CHARACTER ###
  
  Name: ${ai.meta.name}
  Role: ${ai.persona.description}
  ${ai.persona.background ? `Character's background: ${ai.persona.background}` : ""}
  ${ai.persona.styles ? `How character communicates: ${ai.persona.styles.join(", ")}` : ""}
  ${ai.persona.audience ? `Who the character writes for: ${ai.persona.audience}` : ""}
  ${ai.persona.responsibilities ? `Character's responsibilities (FOLLOW ALWAYS, IMPORTANT): ${ai.persona.responsibilities.join(", ")}` : ""}
  ${ai.persona.limitations ? `Character's limitations (FOLLOW ALWAYS, IMPORTANT): ${ai.persona.limitations.join(", ")}` : ""}
  ${ai.persona.traits ? `Character's traits (FOLLOW ALWAYS, IMPORTANT): ${ai.persona.traits.map((t) => t.skill).join(", ")}` : ""}

  ### EXAMPLE RESPONSES FOR THE CHARACTER ###
  ${ai.persona.response_examples ? `${ai.persona.response_examples.map((e) => `User:\n${e?.message}\nYour character:\n${e?.response}\n\n`).join(", ")}` : ""}

  ### INSTRUCTIONS ENDS ###

  Next, user will send you a message. Respond to the message as your character. Before answering, evaluate your answer against character's responsibilities, limitations, traits.

  Do you agree to follow the above instructions to the letter?

  Assistant: I do
  `

  return instructions.replace(/  /g, '').replace(/{/g, '{{').replace(/}/g, '}}').trim()
}

export function getAvatar({ seed, size = 32 }: { seed: string, size?: number }) {
  if(seed.toLowerCase() === 'assistant' || seed.toLowerCase() === 'c1') return C1Icon
  return `https://api.dicebear.com/6.x/miniavs/svg?seed=${seed}&size=${size}&backgroundType=gradientLinear&skinColor=fcd53f&mouth=default&backgroundColor=b6e3f4,c0aede`
}