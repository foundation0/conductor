import { error } from "@/libraries/logging"
import DataActions from "@/data/actions/data"
import VectorsActions from "@/data/actions/vectors"
import UserActions from "@/data/actions/user"
import { DataT, EmbeddingModelsT, IndexersT, VectorT } from "@/data/schemas/data"
import { DataRefT } from "@/data/schemas/workspace"
import { emit, listen } from "./events"
import { lookup } from "mrmime"
import async, { mapLimit } from "async"
import _, { chunk } from "lodash"
import { initLoaders } from "@/data/loaders"
import { UserT } from "@/data/schemas/user"
import { getWorker } from "./workers"
import {
  DATA_TYPES,
  DATA_TYPES_BINARY,
  DATA_TYPES_TEXT,
  DataTypesBinaryS,
  DataTypesTextS,
  DataTypesTextT,
} from "@/data/schemas/data_types"

function getMimeTypeByFileFormat(file_format: string) {
  for (const mime in DATA_TYPES) {
    if (DATA_TYPES[mime].includes(`.${file_format}`)) {
      return mime
    }
  }
  return null
}

function failedFile({ name }: { name: string }) {
  emit({
    type: "data-import/fail",
    data: {
      name,
    },
  })
}

export async function processData(
  {
    file,
    mime,
    content,
    workspace_id,
  }: {
    file: {
      name: string
    }
    mime: string
    content: any
    workspace_id: string
  },
  callback?: Function
) {
  const text_file = _.keys(DATA_TYPES_TEXT).includes(mime)
  const binary_file = _.keys(DATA_TYPES_BINARY).includes(mime)

  // store the file
  const data_id = await DataActions.add({
    _v: 1,
    meta: {
      name: file.name,
    },
    data: {
      mime,
      content,
    },
  })
  if (!data_id) {
    failedFile({ name: file.name })
    return error({ message: "failed to add data", data: { file } })
  }

  emit({
    type: "data-import/progress",
    data: {
      name: file.name,
      progress: 0.01,
    },
  })

  // Vectorize based on file type
  let chunks: { pageContent: string; metadata: { id: string; name: string; start: number; end: number } }[] = []
  let embeddings: number[][] = []
  let embeddings_model: EmbeddingModelsT

  // TEXT/PLAIN
  if (text_file || mime === "application/epub+zip" || mime === "application/pdf") {
    const { worker, terminate } = await getWorker({ file: "vector" })

    chunks = await worker.chunkText({
      type: {
        id: data_id,
        name: file.name,
        mime,
      },
      size: 1536,
      overlap: 200,
      content,
    })
    terminate()
    embeddings_model = "MiniLM-L6-v2"

    emit({
      type: "data-import/progress",
      data: {
        name: file.name,
        progress: 0.02,
      },
    })

    const batch_size = 5 // Math.ceil(chunks.length / 4)
    const chunked_chunks = _.chunk(chunks, batch_size)
    let processed_chunks = 0

    if (batch_size > 0 && chunked_chunks.length > 0) {
      const q = async.queue((data: any, callback: any) => {
        const { batch } = data
        getWorker({ file: "vector" }).then(async ({ worker, terminate: _t }) => {
          const vectors = await worker.vectorizeText({
            model: embeddings_model,
            chunks: batch.map((c: any) => c.pageContent),
          })
          _t()
          processed_chunks += batch_size
          const progress = (processed_chunks * 0.8) / (chunks.length * 0.8)
          emit({
            type: "data-import/progress",
            data: {
              name: file.name,
              progress: progress <= 1 ? progress : 1, // 80% of the progress is for vectorization
            },
          })
          embeddings = [...embeddings, ...vectors]
          return callback()
        })
      }, 4)

      chunked_chunks.forEach((batch: any) => {
        q.push({ batch })
      })

      await q.drain()
    } else {
      error({ message: "Couldn't extract any content", data: { chunks } })
      failedFile({ name: file.name })

      return callback && callback()
    }
  } else if (binary_file) {
    error({ message: "not supported mime type", data: { mime, file } })
    failedFile({ name: file.name })

    return callback && callback()
  } else {
    error({ message: "not supported mime type", data: { mime, file } })
    failedFile({ name: file.name })

    return callback && callback()
  }
  const vectors: VectorT = {
    _v: 1,
    data_id,
    model: embeddings_model,
    locs: chunks.map((c) => c.metadata),
    vectors: embeddings,
  }
  // store the vectors
  await VectorsActions.add({
    data_id,
    vectors,
  })

  // update the workspace vector index
  // await VectorsActions.updateWorkspaceIndex({ workspace_id, indexer: "voy", vectors, data: chunks })

  // add the file to the workspace data
  await UserActions.addDataToWorkspace({
    workspace_id,
    data: {
      id: data_id,
      name: file.name,
      mime,
      filename: file.name,
    },
  })

  emit({
    type: "data-import/done",
    data: {
      mime,
      name: file.name,
    },
  })
  callback && callback()
}

listen({
  type: "data.import",
  action: async (data: {
    file: {
        name: string;
    };
    mime: string;
    content: any;
    workspace_id: string;
},) => {
    await processData(data)
  },
})

export async function processImportedFiles({ files, workspace_id }: { files: any; workspace_id: string }) {
  const q = async.queue(async (data: any, callback: any) => {
    processData({ ...data, workspace_id }, callback)
  }, 2)

  files.forEach((file: any) => {
    if (!file?.name) return error({ message: "no file name" })

    // get the mime
    let mime = lookup(file.name) as string
    if (!mime) {
      mime = getMimeTypeByFileFormat(_.last(file.name.split(".")) || "") as string
      if (!mime) return error({ message: "no mime type", data: { file } })
    }

    const text_file = _.keys(DATA_TYPES_TEXT).includes(mime)
    const binary_file = _.keys(DATA_TYPES_BINARY).includes(mime)

    if (!text_file && !binary_file) {
      failedFile({ name: file.name })

      return error({
        message: "not supported mime type",
        type: "unsupported_mime",
        data: { mime, file, name: file.name },
      })
    }

    // notify that processing has started
    emit({
      type: "data-import/started",
      data: {
        mime,
        name: file.name,
      },
    })

    const reader = new FileReader()

    reader.onabort = () => {
      failedFile({ name: file.name })

      return error({ message: "file reading was aborted", data: { file } })
    }
    reader.onerror = () => {
      failedFile({ name: file.name })

      return error({ message: "file reading failed", data: { file } })
    }
    reader.onload = async () => {
      if (!reader?.result) return error({ message: "empty file" })

      if (DataTypesTextS.safeParse(mime).success === false && DataTypesBinaryS.safeParse(mime).success === false) {
        return error({ type: "unsupported_mime", message: "invalid file type", data: { file } })
      }

      let content: string | ArrayBuffer = reader.result
      if (text_file) {
        // convert array buffer to string
        content = new TextDecoder("utf-8").decode(reader.result as any)
      }

      q.push({
        file,
        mime,
        content,
      })
    }
    reader.readAsArrayBuffer(file as any)
  })
  await q.drain()
}

export async function compileDataForIndex({
  source,
  workspace_id,
  group_id,
  folder_id,
  session_id,
}: {
  source: "workspace" | "group" | "folder" | "session"
  workspace_id?: string
  group_id?: string
  folder_id?: string
  session_id?: string
}) {
  const { VectorsState, DataState, UserState, SessionState } = await initLoaders()
  const user: UserT = await UserState.get()

  let data_source: DataRefT[] = []

  if (source === "workspace") {
    if (!workspace_id) return error({ message: "no workspace id" })
    const workspace = _.find(user.workspaces, { id: workspace_id })
    data_source = workspace?.data || []
  } else if (source === "group") {
    if (!workspace_id) return error({ message: "no workspace id" })
    if (!group_id) return error({ message: "no group id" })
    const workspaceGroup = _.find(user.workspaces, { id: workspace_id })
    const group = _.find(workspaceGroup?.groups, { id: group_id })
    data_source = group?.data || []
  } else if (source === "folder") {
    if (!group_id) return error({ message: "no group id" })
    if (!folder_id) return error({ message: "no folder id" })
    const workspaceGroup = _.find(user.workspaces, { id: workspace_id })
    const group = workspaceGroup?.groups.find((g) => g.id === group_id)
    const folder = group?.folders.find((f) => f.id === folder_id)
    data_source = folder?.data || []
  } else if (source === "session") {
    if (!session_id) return error({ message: "no session id" })
    const session_state = await SessionState.get()
    const session = await session_state?.active?.[session_id]
    data_source = session?.data || []
  } else {
    return error({ message: "invalid source" })
  }

  if (!data_source) return error({ message: "no data source" })

  const data_vectors = await Promise.all(
    data_source.map(async (d: DataRefT) => {
      const vectors: VectorT[] = await (await VectorsState({ id: d.id })).get()
      const data: DataT[] = await (await DataState({ id: d.id })).get()
      return { vectors, data }
    })
  )

  const chunks: any[] = await async.map(data_vectors, (chunk: any, chunk_done) => {
    const binary_file = _.keys(DATA_TYPES_BINARY).includes(chunk.data?.data?.mime)
    if (binary_file) {
      if (chunk.data?.data?.mime === "application/pdf") {
        getWorker({ file: "vector" }).then(({ worker, terminate }) => {
          worker.extractPDFContent(chunk.data?.data?.content).then((text: any) => {
            terminate()
            chunk_done(null, {
              ...chunk.data,
              data: {
                ...chunk.data.data,
                content: text,
              },
            })
          })
        })
      }
    } else {
      return chunk_done(null, chunk.data)
    }
  })

  const content: {
    vectors: VectorT[]
    chunks: DataT[]
  } = {
    vectors: _.map(data_vectors, "vectors").flat(),
    chunks: _.flatten(chunks),
  }
  return content
}

export async function queryIndex({
  query,
  source,
  workspace_id,
  group_id,
  folder_id,
  session_id,
  result_count = 5,
  update = false,
}: {
  query?: string
  source: "workspace" | "group" | "folder" | "session"
  workspace_id?: string
  group_id?: string
  folder_id?: string
  session_id?: string
  result_count?: number
  update?: boolean
}) {
  try {
    const data_vectors = await compileDataForIndex({
      source,
      workspace_id,
      group_id,
      folder_id,
      session_id,
    })
    if (data_vectors) {
      const q: {
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
      } = {
        query: query || "update", // empty for updates
        id: workspace_id || group_id || folder_id || session_id || "n/a",
        indexer: "voy",
        content: {
          vectors: data_vectors.vectors,
          chunks: data_vectors.chunks,
        },
        model: "MiniLM-L6-v2",
        result_count,
        update,
      }
      const { worker, terminate } = await getWorker({ file: "vector", id: `${source}-index` })
      const results = await worker.queryIndex(q)
      await terminate()
      return results
    }
  } catch (e) {
    return error({ message: "failed to query index", data: { e } })
  }

  // }
}
