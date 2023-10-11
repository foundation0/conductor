import { RegisterForm } from "./register_form"

export function ConvertGuest() {
  return (
    <dialog id="ConvertGuest" className="ModuleSetting modal w-full max-w-2xl">
      <div className="modal-box bg-zinc-800/95 border-t border-t-zinc-600">
        <div className="flex w-full ">
          <RegisterForm convert_guest={true} />
        </div>
      </div>
    </dialog>
  )
}
