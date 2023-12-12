import * as z from "zod"
import { ModuleS, StreamingS } from "@/data/schemas/modules"
import { TextMessageS } from "@/data/schemas/sessions"
import _ from "lodash"
// @ts-ignore
import config from "@/config"
import { error } from "@/libraries/logging"
import { PEClient } from "@/libraries/pe"
import eventEmitter from "@/libraries/events"
import { LLMVariantT } from "@/data/schemas/modules"
import fetchStreamParser from '@async-util/fetch';

const variant_setting = {
  max_tokens: 2000,
  temperature: 0,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
}

export let specs: z.infer<typeof ModuleS> = {
  _v: 1,
  _updated: 1,
  id: "automatic1111",
  active: true,
  meta: {
    author: "0x000",
    description: "Connect to any Automatic1111 compatible local LLM server",
    name: "LLM",
    type: "LLM",
    vendor: { name: "Automatic1111 Engine" },
    variants: [
      {
        id: "local_llm",
        name: "Local LLM",
        type: "language",
        context_len: 100000000,
        settings: variant_setting,
      },
    ],
  },
  settings: {},
}

const InputS = z.object({
  user_id: z.string().min(1),
  model: z.string().default("na"),
  prompt: z.object({
    instructions: z.string().optional(),
    user: z.string(),
  }),
  history: z.array(TextMessageS),
  settings: z
    .object({
      max_tokens: z.number().min(0).optional(),
      temperature: z.number().min(0).max(2).optional(),
      top_p: z.number().min(0).max(1).optional(),
      frequency_penalty: z.number().min(0).max(1).optional(),
      presence_penalty: z.number().min(0).max(1).optional(),
      n: z.number().optional(),
      stop: z.string().optional(),
    })
    .optional(),
})

export const OutputS = z.string()

type InputT = z.infer<typeof InputS>
type OutputT = z.infer<typeof OutputS>

export const main = async (input: InputT, callbacks: z.infer<typeof StreamingS>) => {
  const { user_id, model, prompt, settings, history } = InputS.parse(input)
  const { setGenController, onData, onClose, onError } = StreamingS.parse(callbacks)

	const msgs = _(history)
		.map((msg, i) => {
			switch (msg.type) {
				case 'system':
					return { role: 'system', content: msg.text };
				case 'human':
					return { role: 'user', content: msg.text };
				case 'ai':
					return { role: 'assistant', content: msg.text };
				default:
					throw new Error(`Unknown message type: ${msg.type}`);
			}
		})
		.compact()
		.value();

    const costs = {
			input: {
				usedTokens: 0,
				usedUSD: 0
			},
			output: {
				usedTokens: 0,
				usedUSD: 0,
			}
		}
  
    // transform settings from snake_case to camelCase
    let _settings: { [key: string]: string | number | string[] } = {};
    if(settings) {
      for (const key in settings) {
        const ck = key.replace(/(_\w)/g, (m) => m[1].toUpperCase());
        // @ts-ignore
        _settings[ck] = settings[key];
      }
      _settings = { ...settings };
    }
    
  
    const abortController = new AbortController();
    setGenController && setGenController({ abort: () => abortController.abort() })
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'na',
        messages: msgs,
        max_tokens: settings?.max_tokens || 2000,
        stop: settings?.stop || ["<|user|>", "<|assistant|>"],
        temperature: settings?.temperature || 0.8,
        top_p: settings?.top_p || 1,
        // top_k: settings?.top_k || 50,
        // repetition_penalty: settings?.repetition_penalty || 1,
        stream: true,
      }),
      signal: abortController.signal,
    };

    try {
      // @ts-ignore
      const textStream = await fetchStreamParser('http://localhost:1234/v1/chat/completions', options).catch((e) => {
        if (e === 'AbortError') {
          if(typeof onError === 'function') onError({ error: 'Aborted' })
          return false
        }
        if(typeof onError === 'function') onError({ error: e })
        return false
      });
      // callbacks.setAbort(() => abortController.abort());
      /* const textStreamf = await openai.chat.completions
        .create({
          model: `${vendor}/${variant_id}`,
          ...(settings || {}),
          messages: msgs,
          stream: true,
        })
        .catch((e) => console.log(e));
   */
      if (!textStream) {
        if(typeof onError === 'function') onError({ error: 'No connection' })
        throw new Error('No text stream');
      }
  
      // start the stream
      let output = ''
      // @ts-ignore
      for await (const data of textStream.lines()) {
        
        if(data) {
          if(data === 'data: [DONE]') {
            if (typeof onClose === "function") onClose({ reason: 'end'})
            break
          }
          try {
            const l = JSON.parse(data.replace('data: ', ''));
            // @ts-ignore
            let msg = (l?.choices?.[0]?.delta?.content || '')
            const msg_stop = msg.split('### Instruction:')
            if(msg.length > 1) msg = msg_stop[0]
            if(msg) {
              if (typeof onData === "function") onData(msg);
              output += msg;
              // append({ request_id, data: msg });
            }
          } catch(e: any) {
            throw new Error(e)
          }
  
        }
      }
      console.log('done');
    } catch (error) {
      console.log('e', error);
    }
  /* return new Promise(async (resolve, reject) => {
    let output = ""

    const ULE = await PEClient({
      host: config.services.ule_URI,
      onData: (data) => {
        output += data
        if (typeof onData === "function") onData({ data })
      },
      onDone: (data) => {
        if (typeof onClose === "function") onClose(data)
        resolve(data)
      },
      onError: (err) => {
        const error = {
          code: err.code || "unknown",
          message: err.error || err.message || err || "unknown",
          status: "error",
          surpress: false,
        }
        if (error.message === "canceled") return resolve(output)
        if (error.code === 402) {
          eventEmitter.emit("ule:402", { user_id })
          error.surpress = true
        }
        if (typeof onError === "function") onError(error)
      },
    })

    setGenController && setGenController({ abort: () => ULE.abort({ user_id }) }) */

    /* const messages: any = [
      {
        type: "system",
        text: prompt.instructions || "You are a helpful assistant",
      },
      ...history.map((message) => {
        if (message.type === "human" && message.text) {
          return {
            type: "user",
            text: message.text,
          }
        } else if (message.type === "ai" && message.text) {
          return {
            type: "assistant",
            text: message.text,
          }
        }
      }),
    ]
    if (messages[messages.length - 1]?.type === "assistant" || messages.length === 1) {
      messages.push({
        type: "user",
        text: prompt.user,
      })
    }

    ULE.compute({
      type: "ComputeLLM",
      user_id,
      params: {
        model,
        messages,
        settings,
      },
    })
  }) */
}

export const fetchUpdates = async (): Promise<LLMVariantT[]> => {
  return []
}
