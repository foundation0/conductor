import * as Comlink from "comlink"
import Tokenizers from '@foundation0/tokenizers';

async function tokenize(args: any){
  const tokenizer = await Tokenizers(args)
  if (!tokenizer) throw new Error('Tokenizer not found');
	let tokens = await tokenizer({ text: args.input });
  return tokens
}

Comlink.expose({ tokenize, ping: () => "pong" })
