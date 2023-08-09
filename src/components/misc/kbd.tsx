import { getOS } from "../libraries/utilities"

function getOSKey(fnk: string) {
  let k = fnk
  switch (fnk.toLowerCase()) {
    case 'alt':
      k = getOS() === 'MacOS' ? '⌥' : 'Alt'
      break
    case 'ctrl':
      k = getOS() === 'MacOS' ? '⌃' : 'Ctrl'
      break
    case 'cmd':
      k = getOS() === 'MacOS' ? '⌘' : 'Win'
      break
  }
  return k
}

export function KBD({ fnk, fnk2, ck, desc } : { fnk: string, fnk2?: string, ck: string, desc: string }) {
  
  return <><kbd className="kbd kbd-xs">{getOSKey(fnk)}</kbd> + {fnk2 && <><kbd className="kbd kbd-xs">{getOSKey(fnk2)}</kbd> + </>}<kbd className="kbd kbd-xs">{ck.toUpperCase()}</kbd> {desc.toLowerCase()}</>
}