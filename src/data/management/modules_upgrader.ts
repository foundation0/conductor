import { UserT } from "@/data/loaders/user"
import { MODULES } from "@/modules"

async function upgradeModules( { user }: { user: UserT}){
  const installed_modules = user.modules.installed

  // go over each module and see if _updated is higher in MODULES than in user.modules.installed
}