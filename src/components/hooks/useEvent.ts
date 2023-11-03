import { listen } from "@/libraries/events"
import { useEffect, useState } from "react"

export const useEvent = ({ name, action, target }: { name: string | string[]; action: Function; target?: string }) => {
  const [isMounted, setIsMounted] = useState(true)

  useEffect(() => {
    let stop: Function | null = null
    if (isMounted) {
      // Add the event listener here
      stop = listen({
        type: name,
        action: async (data: any) => {
          if (!target) return action(data)
          if (target && target === data.target) return action(data)
        },
      })
    }

    return () => {
      // Remove the event listener here
      if (stop) stop()
      setIsMounted(false)
    }
  }, [])
}
