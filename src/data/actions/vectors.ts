import { initLoaders } from "@/data/loaders"
import { DataS, VIndexS, VIndexT, VectorS, VectorT } from "@/data/schemas/data"
import _ from "lodash"
import { nanoid } from "nanoid"
import { z } from "zod"
import { emit } from "@/libraries/events"
import { error, ph } from "@/libraries/logging"
import { VoyVectorStore } from "langchain/vectorstores/voy"
import { Voy as VoyClient } from "voy-search"
import { HuggingFaceTransformersEmbeddings } from "langchain/embeddings/hf_transformers"
import { Document } from "langchain/dist/document"

const API = {
  async add({ data_id, vectors }: { data_id: string; vectors: VectorT }) {
    const { VectorsState } = await initLoaders()
    const store = await VectorsState({ id: data_id })

    // check if the store exists
    const existing_store = await store.get()
    // if the store exists and the vectors are the same, abort
    if (existing_store?.vectors.length === vectors.vectors.length) {
      return true
    }

    // validate data
    const validated = VectorS.safeParse(vectors)

    if (!validated.success) {
      return error({
        message: "invalid vectors",
        data: {
          vectors,
        },
      })
    }

    await store.set(validated?.data)

    emit({ type: "vectors/add", data: { data_id, vectors } })
  },
  async delete({ id }: { id: string }) {
    const { VectorsState } = await initLoaders()
    const store = await VectorsState({ id })
    await store.destroy()
  },
  async updateWorkspaceIndex({
    workspace_id,
    indexer,
    vectors,
    data,
  }: {
    workspace_id: string,
    indexer: "voy"
    vectors: VectorT
    data: Document<Record<string, any>>[]
  }) {
    const { VIndexesState } = await initLoaders()
    const store = await VIndexesState({ id: workspace_id })

    let voyClient: VoyClient

    // check if the store exists
    const existing_store = await store.get()
    if (existing_store) voyClient = VoyClient.deserialize(existing_store.data.index)
    else voyClient = new VoyClient()

    const embed_model = new HuggingFaceTransformersEmbeddings({
      modelName: "Xenova/all-MiniLM-L6-v2",
    })

    const voy = new VoyVectorStore(voyClient, embed_model)

    await voy.addVectors(vectors.vectors, data)

    const serialized = voy.toJSON()

    const vindex: VIndexT = {
      _v: 1,
      workspace_id,
      data: {
        indexer,
        index: JSON.stringify(serialized),
      },
    }

    // validate data
    const validated = VIndexS.safeParse(vindex)
    if(!validated.success) {
      return error({
        message: "invalid vector index",
        data: {
          index: serialized,
        },
      })
    }

    await store.set(validated?.data)
  },
}

export default API
