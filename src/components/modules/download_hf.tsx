import HFIcon from "@/assets/icons/hf-logo.svg"
import { getBridgeAPI } from "@/libraries/bridge"
import { error } from "@/libraries/logging"
import { useState } from "react"
import { MdOutlineCloudDownload, MdClose } from "react-icons/md"

export function DownloadFromHF({ downloadModel }: { downloadModel: ({ url }: { url: string }) => void }) {
  const [hf_url, setHFURL] = useState("")

  return (
    <dialog id="download-hf-modal" className="DownloadHFModel modal w-full transition-all">
      <div className="modal-box bg-zinc-800/95 border-t border-t-zinc-600 relative">
        <div className="absolute top-2 right-2">
          <MdClose
            className="w-5 h-5 text-zinc-500 hover:text-zinc-200 transition-all cursor-pointer"
            onClick={() => {
              ;(window as any)["download-hf-modal"].close()
            }}
          />
        </div>
        <div className="flex flex-row items-start gap-2">
          <div className="flex items-center">
            <img src={HFIcon} className="w-10 h-10" />
          </div>
          <div className="flex flex-1 flex-col mt-1">
            <div className="flex flex-row">
              <div className="text-xl font-semibold">HuggingFace downloader</div>{" "}
              <div className="text-xs font-bold mb-1 ml-1 text-yellow-300">BETA</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col mt-3">
          <div className="text-xs text-zinc-300 ml-3 mb-1 font-semibold">Model file URL</div>
          <label className="flex flex-row bg-zinc-700/30 border border-zinc-900 border-t-zinc-700 rounded-lg items-center p-0 pr-2 text-xs font-semibold">
            <input
              className="flex flex-1 bg-transparent text-xs border-0 rounded  placeholder-zinc-400 text-zinc-300 outline-none focus:outline-none ring-0 shadow-transparent input  font-normal"
              name="hf_url"
              type="url"
              value={hf_url}
              onChange={(e) => setHFURL(e.target.value.trim())}
              placeholder="https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGML/llama-2-7b-chat.ggmlv3.q4_0.bin"
              id="hf_url"
              autoComplete="off"
            />
            <button
              type="submit"
              className="lex inset-y-0 right-0 h-full px-0 focus:outline-none font-medium rounded-lg text-sm px-2 text-zinc-400 hover:text-zinc-200 py-2 saturate-50 hover:saturate-100 transition-all bg-zinc-900/50 hover:bg-zinc-900/70 border-t border-t-zinc-700/70"
              onClick={() => downloadModel({ url: hf_url })}
            >
              <MdOutlineCloudDownload className="w-5 h-5" />
            </button>
          </label>
        </div>
      </div>
    </dialog>
  )
}
