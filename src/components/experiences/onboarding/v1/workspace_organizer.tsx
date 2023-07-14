export default function WorkspaceOrganizer() {
  return (
    <div className="flex flex-col gap-3 text-left">
      <p className="flex text-xl font-semibold items-center">Session organizer</p>
      <p className="">Session organizer has one job in life: to keep your sessions organized.</p>
      <p className="">
        In each workspace, you can have multiple groups and each group can have multiple folders. Folders are where your
        sessions live.
      </p>
      <p className="">Use groups and folders to segment your work for easier findability.</p>
      <div className="bg-zinc-900 p-3 pt-2 text-xs font-light rounded border border-zinc-700">
        <strong className="font-bold">FYI</strong>
        <br />
        At the moment, organizer is limited to one level of nesting and you can't move things around. We're working on
        it. Soon, there might be even some AI-based automated organizing coming your way 🤫
      </div>
    </div>
  )
}
