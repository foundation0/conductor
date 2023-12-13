import { HuggingFaceTransformersEmbeddings } from "langchain/embeddings/hf_transformers"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import {
  DataT,
  EmbeddingModelsT,
  IndexersT,
  VectorT,
} from "@/data/schemas/data"
import * as Comlink from "comlink"
import { Voy as VoyClient } from "voy-search"
import { VoyVectorStore } from "langchain/vectorstores/voy"
import _ from "lodash"
import { error } from "./logging"
import { LANGUAGES } from "@/data/schemas/data_types"
import b4a from "b4a"
import { getDocument, PDFDocumentProxy, GlobalWorkerOptions } from "pdfjs-dist"
// @ts-ignore
import * as pdfjsWorker from "pdfjs-dist/build/pdf.worker"
GlobalWorkerOptions.workerSrc = pdfjsWorker

import { env } from "@xenova/transformers"
import { getModel } from "./models"

env.backends.onnx.wasm.wasmPaths = "/assets/wasm/"
// env.localModelPath = "/models/"
env.allowRemoteModels = true
env.allowLocalModels = false

export async function extractPDFContent(pdfData: ArrayBuffer): Promise<string> {
  let content = ""

  try {
    // Load the PDF document
    const loadingTask = await getDocument({
      data: pdfData,
      disableAutoFetch: true,
    })
    const pdf: PDFDocumentProxy = await loadingTask.promise

    // Loop over each page in the PDF
    for (let i = 1; i <= pdf.numPages; i++) {
      // Get the first page
      const page = await pdf.getPage(i)

      // Get the text content of the page
      const textContent = await page.getTextContent()

      // Concatenate the text items into a single string
      for (const item of textContent.items) {
        // @ts-ignore - f'ing typescript
        const txt = item.str
        content += txt + "\n"
      }
    }
  } catch (error) {
    console.error("Error while extracting PDF content:", error)
    throw error // re-throw the error to be handled by the caller
  }

  return content
}

// @ts-ignore
globalThis.Buffer = b4a

const INDEX_CACHE: { [key: string]: any } = {}

export async function chunkText({
  size = 1536,
  overlap = 200,
  type,
  content,
}: {
  size: number
  overlap: number
  type: {
    id: string
    name: string
    mime: string
  }
  content: string | ArrayBuffer
}) {
  let _content: string = ""
  try {
    if (typeof content === "string") _content = content

    let splitter = new RecursiveCharacterTextSplitter({
      chunkSize: size,
      chunkOverlap: overlap,
    })
    if (LANGUAGES[type.mime] || type.mime === "text/plain") {
      let lang = LANGUAGES[type.mime]
      if (type.mime === "text/plain") lang = "markdown"

      if (!lang) {
        return { error: `Unknown language: ${type.mime}` }
      }

      splitter = RecursiveCharacterTextSplitter.fromLanguage(lang as any, {
        chunkSize: size,
        chunkOverlap: overlap,
      })
    } else if (type.mime === "application/pdf") {
      if (!content) return error({ message: "No content" })
      const pdf_data = await extractPDFContent(content as ArrayBuffer)
      _content = pdf_data
    } else if (type.mime === "application/epub+zip") {
      return error({ message: "epubs not supported yet" })
    }

    if (!_content) return { error: "No content" }
    let chunks = await splitter.createDocuments([_content], [])

    chunks = chunks.map((chunk, i) => {
      const [startIndex, endIndex] = findChunkPosition({
        full_text: _content,
        chunk: chunk.pageContent,
      })
      return {
        ...chunk,
        pageContent: `MIME: ${type.mime}\nNAME: ${type.name}\nCHUNK: ${i + 1}/${
          chunks.length
        }\n\n${chunk.pageContent}`,
        metadata: {
          ...type,
          start: startIndex,
          end: endIndex,
        },
      }
    })

    return chunks
  } catch (e) {
    return { error: e }
  }
}

function findChunkPosition({
  full_text,
  chunk,
}: {
  full_text: string
  chunk: string
}): [number, number] {
  const startIndex = full_text.indexOf(chunk, 0)
  if (startIndex === -1) {
    return [0, 0]
  }
  const endIndex = startIndex + chunk.length
  return [startIndex, endIndex]
}

export async function vectorizeText({
  model,
  chunks,
}: {
  model: EmbeddingModelsT
  chunks: string[]
}) {
  let embed_model = await getModel({ model })

  const embeddings = await embed_model.embedDocuments(chunks)

  return embeddings
}

export async function queryIndex({
  query,
  id,
  indexer,
  content,
  model,
  result_count = 5,
  update = false,
}: {
  query: string
  id: string
  indexer: IndexersT
  content: {
    vectors: VectorT[]
    chunks: DataT[]
  }
  model: EmbeddingModelsT
  result_count?: number
  update?: boolean
}) {
  let embed_model = await getModel({ model })

  let store: any
  switch (indexer) {
    case "voy":
      store = new VoyClient()
      break
    default:
      return { error: `Unknown indexer: ${indexer}` }
  }
  if (update || !INDEX_CACHE[id]) {
    INDEX_CACHE[id] = new VoyVectorStore(store, embed_model)

    // recreate the chunks from vectors using locs
    const chunks = _(content?.vectors)
      .map((v: VectorT, i: number) => {
        if (!v) return null
        return v.locs?.map(
          (meta: { start: number; end: number; id: string; name: string }) => {
            const c = content?.chunks?.[i]?.data?.content

            return {
              pageContent: content.chunks[i].data.content.slice(
                meta.start,
                meta.end,
              ),
              metadata: { id: meta.id, name: meta.name },
            }
          },
        )
      })
      .compact()
      .value()
    if (!chunks) {
      console.error("No chunks found")
      return null
    }
    const vectors = _(content?.vectors)
      .map((v) => v?.vectors)
      .compact()
      .value()
    const add_proms = vectors.map((v, i) => {
      if (!v || !chunks[i]) {
        console.error("No chunk or vector found", i, vectors, chunks)
        return null
      }
      if (v.length !== chunks[i].length) {
        console.error("Chunk length mismatch", v, chunks[i])
        return null
      }
      return INDEX_CACHE[id].addVectors(v, chunks[i])
    })
    try {
      await Promise.all(add_proms)
    } catch (e) {
      console.error("Error adding vectors", e)
    }
  }
  const retriever = INDEX_CACHE[id].asRetriever(result_count)
  try {
    const results = await retriever.getRelevantDocuments(query)
    return { results }
  } catch (e) {
    return { error: e }
  }
}

Comlink.expose({
  vectorizeText,
  chunkText,
  queryIndex,
  extractPDFContent,
  ping: () => "pong",
})
