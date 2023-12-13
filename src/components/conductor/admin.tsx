import { UserT } from "@/data/loaders/user"
import { getModules } from "@/modules"
import { useLoaderData, useNavigate } from "react-router-dom"
import UserActions from "@/data/actions/user"

export function Admin() {
  const { user_state } = useLoaderData() as { user_state: UserT}
  const navigate = useNavigate()

  async function resetModules() {
    const mods = await getModules({ factory_state: true })

    await UserActions.updateUser({
      ...user_state,
      modules: {
        installed: mods,
      },
    })
    navigate("/c/internal::admin")
    alert("Modules reset to default")
  }

  async function resetExperiences() {
    await UserActions.updateUser({
      ...user_state,
      experiences: [],
    })
    navigate("/c/internal::admin")
    alert("Experiences reset to default")
  }
  return (
    <div className="Settings content flex flex-col flex-grow items-center m-10">
      <div className="flex flex-col w-full justify-start items-start max-w-2xl">
        <div className="text-2xl text-zinc-400 shadow font-semibold mb-4">Admin (use with caution)</div>
        <div className=" text-zinc-400 shadow font-semibold text-lg mb-3 w-full border-b border-b-zinc-700">
          Modules
        </div>
        <div className="flex flex-row w-full">
          <div className="flex flex-col flex-shrink mr-4 justify-center">Reset modules to default</div>
          <div className="flex flex-grow flex-1 justify-end">
            <button className="p-btn-primary rounded" onClick={() => resetModules()}>Reset modules</button>
          </div>
        </div>
        <div className="flex flex-row w-full">
          <div className="flex flex-col flex-shrink mr-4 justify-center">Reset experiences to default</div>
          <div className="flex flex-grow flex-1 justify-end">
            <button className="p-btn-primary rounded" onClick={() => resetExperiences()}>Reset experiences</button>
          </div>
        </div>
      </div>
    </div>
  )
}
