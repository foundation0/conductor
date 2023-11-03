import { error } from "@/libraries/logging"
import { ReactNode, useCallback, useEffect, useState } from "react"
import { useDropzone } from "react-dropzone"
import { processImportedFiles } from "@/libraries/data"
import { initLoaders } from "@/data/loaders"
import _ from "lodash"
import { DataRefT, WorkspaceT } from "@/data/schemas/workspace"
import { emit, listen } from "@/libraries/events"
import Data from "./data"
import UserActions from "@/data/actions/user"
import { useParams } from "react-router-dom"
import { queryIndex } from "@/libraries/data"
import { RxPlus } from "react-icons/rx"
import { AiFillFolderAdd } from "react-icons/ai"
import { DATA_TYPES, DataTypesBinaryT, DataTypesTextT } from "@/data/schemas/data_types"

export default function DataOrganizer() {
  const active_workspace_id = useParams().workspace_id as string

  const [sid, setSid] = useState<string>(useParams().session_id as string)
  const [data_state, setDataState] = useState<DataRefT[]>([])
  const [data_list, setDataList] = useState<DataRefT[]>([])
  const [processing_queue, setProcessingQueue] = useState<
    { name: string; mime: DataTypesTextT | DataTypesBinaryT; progress: number }[]
  >([])
  const [index_query, setIndexQuery] = useState<string>("")
  const [index_ready, setIndexReady] = useState<boolean>(false)

  const supported_file_formats: { [key: string]: string[] } = DATA_TYPES

  async function updateDataState() {
    const { UserState } = await initLoaders()
    const workspace_data: WorkspaceT = _.find((await UserState.get()).workspaces, { id: active_workspace_id })
    const data = workspace_data?.data || []
    setDataState(data)
    if (index_query.length === 0) setDataList(data)
  }

  async function setupVectorIndex() {
    await queryIndex({ update: true, workspace_id: active_workspace_id, source: "workspace" })
    setIndexReady(true)
  }

  async function setup() {
    // Update data state
    updateDataState()

    // Setup data search index
    setupVectorIndex()
  }

  async function reset() {
    setIndexReady(false)
    setDataList([])
    setDataState([])
    setProcessingQueue([])
    setIndexQuery("")
  }

  useEffect(() => {
    setup()
    // Setup listeners
    const stop_data_add_listener = listen({
      type: ["data-import/done", "user/delete_data_from_workspace"],
      action: async ({ name, mime }: { name: string; mime: DataTypesTextT | DataTypesBinaryT }) => {
        await updateDataState()
        if (name) setProcessingQueue((q) => q.filter((d) => d.name !== name))
        await queryIndex({ update: true, workspace_id: active_workspace_id, source: "workspace" })
      },
    })

    const stop_data_fail_listener = listen({
      type: "data-import/fail",
      action: ({ name }: { name: string }) => {
        if (name) setProcessingQueue((q) => q.filter((d) => d.name !== name))
      },
    })

    const stop_data_import_start_listener = listen({
      type: "data-import/started",
      action: ({ name, mime }: { name: string; mime: DataTypesTextT | DataTypesBinaryT }) => {
        setProcessingQueue((q) => _.uniqBy([...q, { name, mime, progress: 0 }], "name"))
      },
    })

    const stop_unsupported_mime_listener = listen({
      type: ["unsupported_mime"],
      action: ({ name }: { name: string }) => {
        setProcessingQueue((q) => q.filter((d) => d.name !== name))
      },
    })

    const stop_sid_listener = listen({
      type: "sessions/change",
      action: ({ session_id }: { session_id: string }) => {
        // console.log(`got updated sid ${session_id}`)
        setSid(session_id)
      },
    })
    return () => {
      reset()
      stop_data_add_listener()
      stop_data_import_start_listener()
      stop_unsupported_mime_listener()
      stop_data_fail_listener()
      stop_sid_listener()
    }
  }, [])

  useEffect(() => {
    setup()
  }, [active_workspace_id])

  // Query index
  useEffect(() => {
    if (index_query)
      queryIndex({ workspace_id: active_workspace_id, source: "workspace", query: index_query }).then((ids) => {
        if (ids) {
          const filtered_list = data_state.filter((d) => _.map(ids, "metadata.id").includes(d.id))
          setDataList(filtered_list)
        }
      })
    else setDataList(data_state)
  }, [index_query])

  const onDrop = useCallback((acceptedFiles: any, fileRejections: any) => {
    if (fileRejections.length > 0) {
      fileRejections.map(({ file, errors }: any) => {
        return error({
          message: `File ${file.name} was rejected: ${errors.map((e: any) => e.message).join(", ")}`,
          data: errors,
        })
      })
    } else {
      processImportedFiles({ files: acceptedFiles, workspace_id: active_workspace_id })
    }
  }, [])
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    maxFiles: 10,
    maxSize: 100000000, // 100mb
    accept: supported_file_formats,
  })

  return (
    <div className={`h-full w-full flex flex-col gap-3`}>
      <div
        onClick={function () {
          open()
        }}
        className="flex flex-row bg-zinc-800/30 hover:bg-zinc-900/70 border border-dashed border-zinc-700  border-t-zinc-600/70 rounded-md flex-1 p-3 cursor-pointer text-zinc-500 hover:text-zinc-200"
      >
        <div className="flex w-6 w-6 rounded-full bg-zinc-700/30  justify-center items-center overflow-hidden text-zinc-500 font-semibold">
          <AiFillFolderAdd className="w-4 h-4 " />
        </div>
        <div className="flex items-center text-xs ml-2">Add data or resource</div>
        <div className="flex flex-grow justify-end items-center">
          <RxPlus className="w-3 h-3" />
        </div>
      </div>
      <label className="flex flex-row bg-zinc-700/30 border border-zinc-900 border-t-zinc-700 rounded-lg items-center text-xs  font-semibold">
        <input
          className="flex flex-1 w-full bg-transparent text-xs  border-0 rounded  placeholder-zinc-400 text-zinc-300 outline-none focus:outline-none ring-0 shadow-transparent input font-normal h-10"
          name="index-search"
          type="text"
          onChange={(e) => setIndexQuery(e.target.value)}
          disabled={!index_ready}
          placeholder={index_ready ? "Search data..." : "Loading index..."}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      {processing_queue.length > 0 && (
        <div className="mb-3 border-b border-zinc-700">
          <div className="text-zinc-400 text-xs font-extrabold uppercase">Processing</div>
          {_(processing_queue)
            .sortBy("name")
            .map((d, i) => {
              return <Data key={`pq-${i}`} {...d} id={i.toString()} isLoading={true}></Data>
            })
            .value()}
        </div>
      )}
      <div {...getRootProps()} className="flex flex-col gap-1 h-full w-full relative">
        <input {...getInputProps()} />
        {
          _(data_list)
            .sortBy("created_at", "desc")
            .map((d: any) => {
              return (
                <div className="min-w-[50px] max-w-[400px] w-full flex-nowrap" key={d.id}>
                  <Data
                    {...d}
                    onClick={() => {
                      if (!sid) return error({ message: "no session id" })
                      // console.log('adding to ', sid)
                      emit({ type: "sessions.addData", data: { target: sid, session_id: sid, data: d } })
                    }}
                    onRemove={() => {
                      if (confirm("Are you sure you want to delete this?")) {
                        UserActions.deleteDataFromWorkspace({
                          workspace_id: active_workspace_id,
                          data_id: d.id,
                        })
                      }
                    }}
                    menu={[
                      {
                        label: "Add item to current session",
                        callback: function () {
                          if (!sid) return error({ message: "no session id" })
                          emit({ type: "sessions.addData", data: { session_id: sid, data: d } })
                        },
                      },
                      {
                        label: "Delete item",
                        callback: function () {
                          if (confirm("Are you sure you want to delete this?")) {
                            UserActions.deleteDataFromWorkspace({
                              workspace_id: active_workspace_id,
                              data_id: d.id,
                            })
                          }
                        },
                      },
                    ]}
                  ></Data>
                </div>
              )
            })
            .value() as ReactNode[]
        }

        {isDragActive && (
          <div className="absolute top-0 bottom-0 left-0 right-0 bg-zinc-900/80 rounded-xl flex flex-col align-center justify-center h-full border-2 border-dashed border-zinc-700 gap-2">
            <div className="text-center font-bold text-zinc-200">Drop your files here</div>
            <div className="text-center text-xs font-semibold uppercase text-zinc-400">Supported file formats</div>
            <div className="flex flex-row flex-wrap justify-center gap-2">
              {_.map(Object.keys(supported_file_formats), (mime) => {
                return _.map(supported_file_formats[mime], (ext, i) => {
                  return (
                    <div
                      key={`format-${i}`}
                      className="text-center text-[12px] bg-zinc-800 p-1 rounded font-semibold text-zinc-200"
                    >
                      {ext}
                    </div>
                  )
                })
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
