import { error } from "./logging"

export const copyToClipboard = async (text: string, id?: string, setUsedIcon?: Function) => {
  if (!navigator.clipboard) {
    console.error("Clipboard API not available")
    return
  }

  try {
    const permission = await navigator.permissions.query({ name: "clipboard-write" as any })
    if (permission.state === "granted" || permission.state === "prompt") {
      await navigator.clipboard.writeText(text)
      if (id && setUsedIcon) setUsedIcon(id)
    } else {
      error({ message: "Clipboard permission denied" })
    }
  } catch (err) {
    try {
      if (typeof navigator?.clipboard?.writeText === "function") {
        navigator.clipboard.writeText(text)
        if (id && setUsedIcon) setUsedIcon(id)
      }
    } catch (e) {
      error({ message: "Copy failed", data: err })
    }
  }
}
