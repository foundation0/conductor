import { listen } from "@/libraries/events"
import { useEffect, useState } from "react"

export const useEvent = ({ name, action, target }: { name: string | string[]; action: Function; target?: string }) => {
  const [isMounted, setIsMounted] = useState(true)

  let last_triggered: {[key: string]: number} = {}

  useEffect(() => {
    let stop: Function | null = null
    if (isMounted) {
      stop = listen({
        type: name,
        action: async (data: any) => {
          const ts = new Date().getTime()
          if(ts - (last_triggered[Array.isArray(name) ? name.join() : name] || 0) > 100) {
            last_triggered[Array.isArray(name) ? name.join() : name] = ts
            if (!target) return action(data)
            if (target && target === data?.target) return action(data)
          }
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
