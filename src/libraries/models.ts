import { EmbeddingModelsT } from "@/data/schemas/data"
import { HuggingFaceTransformersEmbeddings } from "langchain/embeddings/hf_transformers"

type ModelCacheT = {
  [key in EmbeddingModelsT]?: any
}

const MODEL_CACHE: ModelCacheT = {}

export async function getModel({ model }: { model: EmbeddingModelsT }) {
  let _model = MODEL_CACHE[model]
  switch (model) {
    case "MiniLM-L6-v2":
      _model = MODEL_CACHE[model] = new HuggingFaceTransformersEmbeddings({
        modelName: "Xenova/all-MiniLM-L6-v2",
      })

      break
    default:
      return { error: `Unknown model: ${model}` }
  }
  return _model
}
