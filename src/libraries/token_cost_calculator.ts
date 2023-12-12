import { LLMVariantT } from '@/data/schemas/modules';
import { getWorker } from "./workers"

export async function calculateTokenCost({
	tokenizer_type,
	tokenizer_name,
	input,
	model,
	io,
	costs,
}: {
	tokenizer_type: string;
	tokenizer_name: string;
	input: string;
	model: LLMVariantT;
	io: 'input' | 'output';
	costs: {
		input: number;
		output: number;
	};
}) {
	const { worker, terminate }  = await getWorker({ file: 'tokenizer' })

  // console.log(input, typeof input, input.length)
	if (typeof input !== 'string' || input.length === 0) throw new Error('Invalid input');
	let tokens = await worker.tokenize({ tokenizer_name, tokenizer_type, input });
	terminate()

	// anthropic tweaks because their tokenizer is constantly off about 10 tokens
	if (model.id.startsWith('anthropic')) {
		// anthropic input tokens are 1/2 of output tokens
		if (io === 'input') {
			tokens += 10;
		}
		// anthropic output tokens are 1/2 of input tokens
		if (io === 'output') {
			tokens += 10;
		}
	}

	// calculate cost
	const cost = {
		usedTokens: tokens,
		usedUSD: (tokens * (io === 'input' ? costs.input : costs.output)) / 1000,
	};
	const { usedTokens, usedUSD } = cost as { usedTokens: number; usedUSD: number };
	return { usedTokens, usedUSD };
}
