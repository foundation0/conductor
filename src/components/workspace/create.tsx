import { Form } from "react-router-dom"

export default function WorkspaceCreate() {
  return (
    <div className="flex flex-col flex-grow justify-center items-center">
      <h1>Create new workspace</h1>
      <Form method="put" className="flex flex-col justify-center items-center" action="/conductor/workspace">
        <input
          type="text"
          name="name"
          placeholder="Workspace name"
          className="w-64 p-2 input rounded border border-zinc-700 mb-3"
        />
        <button type="submit" className="w-64 p-2 btn btn-primary rounded border border-zinc-700">
          Create
        </button>
      </Form>
    </div>
  )
}
