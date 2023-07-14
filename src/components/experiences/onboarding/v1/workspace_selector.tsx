export default function WorkspaceSelector() {
  return (
    <div className="flex flex-col gap-3 text-left">
      <p className="flex text-xl font-semibold items-center">Workspaces</p>
      <p className="">Here are your workspaces. Prompt did one for you when you created your account.</p>
      <p>You can use them to separate projects without any shared context. Click the plus icon to create a new workspace. You can create as many as you want.</p>
      <p className="flex mt-3 text-md font-bold items-center">Global settings and user profile</p>
      <p className="">
        At the bottom of the workspace selector, you can find global settings, which includes your user profile.
      </p>
    </div>
  )
}
