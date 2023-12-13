import { ph } from "@/libraries/logging"
import { useEffect } from "react"

export default function Data() {
  useEffect(() => {
    ph().capture("experiences/onboarding/v1/data")
  }, [])
  return (
    <div className="flex flex-col gap-3 text-left">
      <p className="flex text-xl font-semibold items-center">Workspace data</p>
      <p className="">Session organizer has one job: to keep your sessions organized.</p>
      <p className="">
        In each workspace, you can have multiple groups and each group can have multiple folders. Folders are where your
        sessions live.
      </p>
      <p className="">Groups and folders give you workspace structure and makes it easier to organize.</p>
      {/* <div className="bg-zinc-900 p-3 pt-2 text-xs font-light rounded border border-zinc-700">
        <strong className="font-bold">FYI</strong>
        <br />
        At the moment, organizer is limited to one level of nesting and you can't move things around. We're working on
        it. Soon, there might be even some AI-based automated organizing coming your way 🤫
      </div> */}
    </div>
  )
}
