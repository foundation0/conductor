import { KBD } from "@/components/misc/kbd"

export function KBDs() {
  return (
    <div className="flex mt-5 flex-col justify-center items-center gap-4">
      <div className="text-xs text-zinc-400">
        <KBD fnk={{ windows: "alt", macos: "ctrl" }} ck="T" desc="new session" />
      </div>
      <div className="text-xs text-zinc-400">
        <KBD fnk={{ windows: "alt", macos: "ctrl" }} ck="R" desc="rename session" />
      </div>
      <div className="text-xs text-zinc-400">
        <KBD fnk={{ windows: "alt", macos: "ctrl" }} ck="W" desc="close session" />
      </div>
      <div className="text-xs text-zinc-400">
        <KBD
          fnk={{ windows: "shift", macos: "shift" }}
          fnk2={{ windows: "alt", macos: "ctrl" }}
          ck="D"
          desc="delete session"
        />
      </div>
    </div>
  )
}
