import { OSesT } from "@/data/schemas/misc"
import { getOS } from "@/libraries/utilities"

function getOSKey(fnk: FnkType) {
  const os: OSesT = getOS()
  let k = fnk[os] || fnk["windows"] // if no key for OS, use Windows
  switch (k.toLowerCase()) {
    case "alt":
      k = getOS() === "macos" ? "⌥" : "Alt"
      break
    case "ctrl":
      k = getOS() === "macos" ? "⌃" : "Ctrl"
      break
    case "cmd":
      k = getOS() === "macos" ? "⌘" : "Win"
      break
  }
  return k
}

type FnkType = Partial<{ [key in OSesT]: string }> & { windows: string }

export function KBD({ fnk, fnk2, ck, desc }: { fnk: FnkType; fnk2?: FnkType; ck: string; desc: string }) {
  return (
    <>
      <kbd className="kbd kbd-xs">{getOSKey(fnk)}</kbd> +{" "}
      {fnk2 && (
        <>
          <kbd className="kbd kbd-xs">{getOSKey(fnk2)}</kbd> +{" "}
        </>
      )}
      <kbd className="kbd kbd-xs">{ck.toUpperCase()}</kbd> {desc.toLowerCase()}
    </>
  )
}
