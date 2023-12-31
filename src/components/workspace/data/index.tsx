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
import {
  DATA_TYPES,
  DataTypesBinaryT,
  DataTypesTextT,
} from "@/data/schemas/data_types"
import { DataT } from "@/data/schemas/data"
import { mAppT, mChatSessionT } from "@/data/schemas/memory"
import useMemory from "@/components/hooks/useMemory"
import { useEvent } from "@/components/hooks/useEvent"
import { getMemoryState } from "@/libraries/memory"
import { UserT } from "@/data/schemas/user"

export default function DataOrganizer() {
  const mem_app: mAppT = useMemory({ id: "app" })
  const { workspace_id, session_id } = mem_app
  const user_state = useMemory<UserT>({ id: "user" })
  const workspace: WorkspaceT | undefined = _.find(user_state.workspaces, {
    id: workspace_id,
  })
  if (!workspace) return null
  const url_session_id = useParams().session_id as string
  const mem_data = useMemory<{
    sid: string
    data_state: DataRefT[]
    data_list: DataRefT[]
    processing_queue: {
      name: string
      mime: DataTypesTextT | DataTypesBinaryT
      progress: number
    }[]
    index_query: string
    index_ready: boolean
    active_preview_id: string
    active_preview_data: DataT["data"] | undefined
  }>({
    id: `workspace-${workspace_id}-data`,
    state: {
      sid: session_id,
      data_state: workspace.data,
      data_list: [],
      processing_queue: [],
      index_query: "",
      index_ready: false,
      active_preview_id: "",
      active_preview_data: undefined,
    },
  })
  const {
    sid,
    data_state,
    data_list,
    processing_queue,
    index_query,
    index_ready,
    active_preview_id,
    active_preview_data,
  } = mem_data

  async function previewData({ id }: { id: string }) {
    // setActivePreviewId(`preview-${id}`)
    mem_data.active_preview_id = `preview-${id}`
    // fetch the data
    const { DataState } = await initLoaders()
    const data_state = await DataState({ id })
    const data: DataT = await data_state.get()
    if (!data) return
    var blob = new Blob([data.data.content], { type: data.data.mime })
    var objectUrl = URL.createObjectURL(blob)
    window.open(objectUrl, "_blank", "resizable, width=1020,height=600")
  }

  const supported_file_formats: { [key: string]: string[] } = DATA_TYPES

  useEffect(() => {
    if (index_query.length === 0) mem_data.data_list = workspace?.data || []
  }, [mem_data.index_query])

  async function setupVectorIndex() {
    await queryIndex({
      update: true,
      workspace_id: workspace_id,
      source: "workspace",
    })
    // setIndexReady(true)
    mem_data.index_ready = true
  }

  async function setup() {
    // Setup data search index
    setupVectorIndex()
  }

  async function reset() {
    mem_data.index_ready = false
    mem_data.data_list = []
    mem_data.data_state = workspace?.data || []
    mem_data.processing_queue = []
    mem_data.index_query = ""
  }

  useEvent({
    name: ["data-import/done", "user/delete_data_from_workspace"],
    action: async ({
      name,
      mime,
    }: {
      name: string
      mime: DataTypesTextT | DataTypesBinaryT
    }) => {
      // await updateDataState()
      mem_data.data_state = workspace?.data || []
      if (name) {
        mem_data.processing_queue = mem_data.processing_queue.filter(
          (d) => d.name !== name,
        )
      }
      await queryIndex({
        update: true,
        workspace_id: workspace_id,
        source: "workspace",
      })
    },
  })

  useEvent({
    name: "data-import/fail",
    action: ({ name }: { name: string }) => {
      mem_data.data_state = workspace?.data || []
      if (name) {
        // setProcessingQueue((q) => q.filter((d) => d.name !== name))
        mem_data.processing_queue = mem_data.processing_queue.filter(
          (d) => d.name !== name,
        )
      }
    },
  })

  useEvent({
    name: "data-import/started",
    action: ({
      name,
      mime,
    }: {
      name: string
      mime: DataTypesTextT | DataTypesBinaryT
    }) => {
      mem_data.processing_queue = _.uniqBy(
        [...mem_data.processing_queue, { name, mime, progress: 0 }],
        "name",
      )
    },
  })
  useEvent({
    name: ["unsupported_mime"],
    action: ({ name }: { name: string }) => {
      // setProcessingQueue((q) => q.filter((d) => d.name !== name))
      mem_data.processing_queue = mem_data.processing_queue.filter(
        (d) => d.name !== name,
      )
    },
  })

  useEvent({
    name: "sessions/change",
    action: ({ session_id }: { session_id: string }) => {
      // setSid(session_id)
      mem_data.sid = session_id
    },
  })

  useEffect(() => {
    setup()
    return () => {
      reset()
    }
  }, [])

  useEffect(() => {
    setup()
  }, [workspace_id])

  useEffect(() => {
    mem_data.data_state = workspace?.data || []
    mem_data.data_list = workspace?.data || []
  }, [JSON.stringify(workspace?.data)])

  // Query index
  useEffect(() => {
    if (index_query && index_query.length > 1)
      queryIndex({
        workspace_id: workspace_id,
        source: "workspace",
        query: index_query,
      }).then((ids) => {
        if (ids) {
          const filtered_list = data_state.filter((d) =>
            _.map(ids, "metadata.id").includes(d.id),
          )
          mem_data.data_list = filtered_list
        }
      })
    else {
      mem_data.data_state = workspace?.data || []
      mem_data.data_list = workspace?.data || []
    }
  }, [index_query])

  const onDrop = useCallback((acceptedFiles: any, fileRejections: any) => {
    if (fileRejections.length > 0) {
      fileRejections.map(({ file, errors }: any) => {
        return error({
          message: `File ${file.name} was rejected: ${errors
            .map((e: any) => e.message)
            .join(", ")}`,
          data: errors,
        })
      })
    } else {
      processImportedFiles({ files: acceptedFiles, workspace_id: workspace_id })
    }
  }, [])
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    maxFiles: 10,
    maxSize: 100000000, // 100mb
    accept: supported_file_formats,
  })

  useEvent({
    name: "data/open",
    action: open,
  })

  return (
    <div className={`DataOrganizer h-full w-full flex flex-col gap-3`}>
      <div
        onClick={function () {
          open()
        }}
        className="flex flex-row bg-zinc-800/30 hover:bg-zinc-900/70 border border-dashed border-zinc-700  border-t-zinc-600/70 rounded-md flex-1 p-3 cursor-pointer text-zinc-500 hover:text-zinc-200"
      >
        <div className="flex w-6 w-6 rounded-full bg-zinc-700/30  justify-center items-center overflow-hidden text-zinc-500 font-semibold">
          <AiFillFolderAdd className="w-4 h-4 " />
        </div>
        <div className="flex items-center text-xs ml-2">
          Add data or resource
        </div>
        <div className="flex flex-grow justify-end items-center">
          <RxPlus className="w-3 h-3" />
        </div>
      </div>
      <label className="flex flex-row bg-zinc-700/30 border border-zinc-900 border-t-zinc-700 rounded-lg items-center text-xs  font-semibold">
        <input
          className="flex flex-1 w-full bg-transparent text-xs  border-0 rounded  placeholder-zinc-400 text-zinc-300 outline-none focus:outline-none ring-0 shadow-transparent input font-normal h-10"
          name="index-search"
          type="text"
          onChange={(e) => {
            mem_data.index_query = e.target.value
          }} // setIndexQuery(e.target.value)}
          disabled={!index_ready}
          placeholder={index_ready ? "Search data..." : "Loading index..."}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      {processing_queue.length > 0 && (
        <div className="mb-3 border-b border-zinc-700">
          <div className="text-zinc-400 text-xs font-extrabold uppercase">
            Processing
          </div>
          {_(processing_queue)
            .sortBy("name")
            .map((d, i) => {
              return (
                <Data
                  key={`pq-${i}`}
                  {...d}
                  id={i.toString()}
                  isLoading={true}
                ></Data>
              )
            })
            .value()}
        </div>
      )}
      <div
        {...getRootProps()}
        className="flex flex-col gap-1 h-full w-full relative"
      >
        <input {...getInputProps()} />
        {
          _(data_list)
            .sortBy("created_at", "desc")
            .map((d: any) => {
              return (
                <div
                  className="min-w-[50px] max-w-[400px] w-full flex-nowrap"
                  key={d.id}
                >
                  <Data
                    {...d}
                    onClick={() => {
                      if (!sid) return error({ message: "no session id" })
                      const mem_session = getMemoryState<mChatSessionT>({
                        id: `session-${url_session_id}`,
                      })
                      if (!mem_session) return error({ message: "no session" })
                      mem_session?.session?.data?.push(d)
                      emit({
                        type: "sessions.addData",
                        data: {
                          target: sid,
                          session_id: url_session_id,
                          data: d,
                        },
                      })
                    }}
                    onRemove={() => {
                      if (confirm("Are you sure you want to delete this?")) {
                        const mem_session = getMemoryState<mChatSessionT>({
                          id: `session-${session_id}`,
                        })
                        if (!mem_session)
                          return error({ message: "no session" })
                        mem_session?.session?.data?.splice(
                          mem_session?.session?.data?.indexOf(d),
                          1,
                        )
                        UserActions.deleteDataFromWorkspace({
                          workspace_id: workspace_id,
                          data_id: d.id,
                        })
                      }
                    }}
                    menu={[
                      {
                        label: "View",
                        callback: function () {
                          if (!sid) return error({ message: "no session id" })
                          previewData({ id: d.id })
                        },
                      },
                      {
                        label: "Add to current session",
                        callback: function () {
                          if (!sid) return error({ message: "no session id" })
                          emit({
                            type: "sessions.addData",
                            data: { session_id: sid, data: d },
                          })
                        },
                      },
                      {
                        label: "Rename",
                        callback: function () {
                          if (!sid) return error({ message: "no session id" })
                          emit({
                            type: "data/toggle_edit",
                            data: { target: d.id },
                          })
                        },
                      },
                      {
                        label: "Delete",
                        callback: function () {
                          if (
                            confirm("Are you sure you want to delete this?")
                          ) {
                            UserActions.deleteDataFromWorkspace({
                              workspace_id: workspace_id,
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
        {/* <Document file={active_preview_data?.content} className="w-full h-full" /> */}
        <dialog id={active_preview_id} className="modal w-full max-w-2xl">
          {active_preview_data?.mime === "application/pdf" && <div></div>}
        </dialog>
        {isDragActive && (
          <div className="absolute top-0 bottom-0 left-0 right-0 bg-zinc-900/80 rounded-xl flex flex-col align-center justify-center h-full border-2 border-dashed border-zinc-700 gap-2">
            <div className="text-center font-bold text-zinc-200">
              Drop your files here
            </div>
            <div className="text-center text-xs font-semibold uppercase text-zinc-400">
              Supported file formats
            </div>
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
