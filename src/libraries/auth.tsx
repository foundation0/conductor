import React from "react"
import { useAuth } from "@/components/hooks/useAuth"
import { Navigate, useLocation } from "react-router-dom"
import {
  buf2hex,
  createHash,
  decrypt,
  encrypt,
  getAddress,
  hex2buf,
  keyPair,
  randomBytes,
  securePassword,
  signMessage,
  verifyPassword,
} from "@/security/common"
import { get, set } from "./cloudflare"
import { get as getKV, set as setKV } from "idb-keyval"
import { pack, unpack } from "msgpackr"
import { verify } from "@noble/secp256k1"
import { BufferObjectS, UserS } from "@/data/schemas/user"
import { z } from "zod"
import { error, ph } from "./logging"
import { generateUser } from "./user"
import UsersActions from "@/data/actions/users"
import { UserT } from "@/data/loaders/user"
import b4a from "b4a"

interface AuthContextType {
  user: any
  signin: (
    {
      username,
      password,
      user,
      buffer,
    }: { username: string; password: string; user?: any; buffer?: any },
    callback: VoidFunction,
  ) => void
  signout: (callback: VoidFunction) => void
}

export const AuthContext = React.createContext<AuthContextType>(null!)

export const v1AuthProvider = {
  isAuthenticated: false,
  signin(callback: VoidFunction) {
    v1AuthProvider.isAuthenticated = true
    callback()
  },
  signout(callback: VoidFunction) {
    v1AuthProvider.isAuthenticated = false
    callback()
  },
}

export function RequireAuth({ children }: { children: JSX.Element }) {
  let auth = useAuth()
  let location = useLocation()
  if (!auth.user) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/authentication" state={{ from: location }} replace />
  }

  return children
}

export async function createUser({
  username,
  password,
  reminder,
  email,
  guest,
  custom_master_key,
}: {
  username: string
  password: string
  reminder: string
  email?: string
  guest?: boolean
  custom_master_key?: string
}) {
  const buffer_key = buf2hex({
    input: createHash({ str: username }) as Uint8Array,
  })
  const user_exists = await get({ key: buffer_key })
  if (user_exists) return error({ message: "user already exists" })
  const master_key_buf =
    custom_master_key ? hex2buf({ input: custom_master_key }) : randomBytes(64)
  const master_key = buf2hex({ input: master_key_buf })
  const user_key = buf2hex({
    input: createHash({ str: master_key + username }) as Uint8Array,
  })
  const master_password = buf2hex({
    input: createHash({ str: master_key + "master-password" }) as Uint8Array,
  })
  const key_pair = keyPair({ seed: master_key_buf })

  const buffer = await createBuffer({
    username,
    password,
    reminder,
    user_key,
    master_password,
    key_pair,
  })
  if (!buffer) return error({ message: "invalid buffer" })

  const user: Partial<z.infer<typeof UserS>> = {
    ...generateUser({ public_key: buf2hex({ input: key_pair.public_key }) }),
    _v: 1,
    id: getAddress({ public_key: key_pair.public_key }),
    master_key,
    master_password,
    public_key: buf2hex({ input: key_pair.public_key }),
    meta: {
      username,
      email,
    },
  }
  const user_parsed = UserS.parse(user)
  const user_encrypted = encrypt({ data: user_parsed, key: master_password })
  const user_packed = pack(user_encrypted)
  const signature = await signMessage(user_packed, key_pair.secret_key)
  const valid = verify(
    signature,
    createHash({ str: user_packed }),
    key_pair.public_key,
  )
  if (!valid) {
    error({ message: "invalid signature" })
    return null
  }
  const user_final = pack({
    data: user_encrypted,
    signature,
    public_key: key_pair.public_key,
  })

  // save user
  await set({ key: user_key, value: user_final })
  await setKV(user_key, user_final)
  /* CF KV isn't fast enough for this
  const u = await get({ key: user_key })
  if(!u || !b4a.equals(b4a.from(u), user_packed)) {
    error({ message: "CF error - user not saved" })
    return null
  } */

  // save buffer
  const buf_packed = pack(buffer.buffer)
  const buf_signature = await signMessage(buf_packed, key_pair.secret_key)
  const buf_valid = verify(
    buf_signature,
    createHash({ str: buf_packed }),
    key_pair.public_key,
  )
  if (!buf_valid) {
    error({ message: "invalid buf_signature" })
    return null
  }
  const buffer_packed = pack({
    data: buffer.buffer,
    signature: buf_signature,
    public_key: key_pair.public_key,
  })
  await set({ key: buffer.buffer_key, value: buffer_packed })
  await setKV(buffer.buffer_key, buffer_packed)
  /* CF KV isn't fast enough for this 
  const b = await get({ key: buffer.buffer_key })
  if(!b || !b4a.equals(b4a.from(b), buffer.buffer)) {
    error({ message: "CF error - buffer not saved" })
    return null
  } */

  // store user locally
  if (!guest) {
    UsersActions.addUser({
      id: user.id as string,
      name: username,
      username,
      last_seen: new Date().getTime(),
    })

    if (email) ph().capture("_email", { email })
  }

  return { user, buffer }
}

export async function createBuffer({
  username,
  password,
  reminder,
  user_key,
  master_password,
}: {
  username: string
  password: string
  reminder: string
  user_key: string
  master_password: string
  key_pair: ReturnType<typeof keyPair>
}) {
  const buffer_key = buf2hex({
    input: createHash({ str: username }) as Uint8Array,
  })
  const o = encrypt({ data: { user_key, master_password }, key: password })
  const buffer_obj = {
    _v: 1,
    reminder,
    o,
  }
  const buffer = BufferObjectS.parse(buffer_obj)

  return { buffer, buffer_key }
}

export async function getBuffer({ username }: { username: string }) {
  const buffer_key = buf2hex({
    input: createHash({ str: username }) as Uint8Array,
  })
  const buffer = await get({ key: buffer_key })
  if (!buffer) {
    const buffer = await getKV(buffer_key)
    if (b4a.isBuffer(buffer)) return unpack(buffer)
  }
  if (
    !buffer ||
    (buffer?.data && !BufferObjectS.safeParse(buffer.data).success)
  )
    return error({ message: "invalid buffer" })
  return buffer
}

export async function authenticateUser({
  username,
  password,
  user,
  buffer,
}: {
  username: string
  password: string
  user?: any
  buffer?: { data: z.infer<typeof BufferObjectS> }
}) {
  // get buffer
  // const buffer_key = buf2hex({
  //   input: createHash({ str: username }) as Uint8Array,
  // })
  // if (!buffer) buffer = await get({ key: buffer_key })
  // if (!buffer) {
  //   buffer = await getKV(buffer_key)
  //   if (b4a.isBuffer(buffer)) buffer = unpack(buffer)
  // }

  // TEMPORARY HACK
  const existing_user = await getKV(`${username}:user`)
  if (!existing_user) return error({ message: "invalid user" })

  // temp fix to local auth bug
  // if user doesn't have password saved, this is a legacy object
  // we need to save the password hash for now
  // will be fixed with data channels
  if(!existing_user?.password_hash) {
    const password_hash = await securePassword({ password, salt: 'temps4lt' })
    existing_user.password_hash = buf2hex({ input: password_hash })
    await setKV(`${username}:user`, existing_user)
  } else {
    const valid = await verifyPassword({ password, hash: hex2buf({ input: existing_user.password_hash }), salt: 'temps4lt' })
    if(!valid) {
      return error({ message: "invalid password" })
    }
  }

  return existing_user


  if (!buffer) buffer = await getBuffer({ username })
  if (!buffer) return error({ message: "buffer not found" })

  // try to open buffer
  let opened_buffer: any
  if (buffer?.data) {
    opened_buffer = decrypt({ ...buffer.data.o, key: password })
    if (!opened_buffer) return error({ message: "invalid password" })
  } else if ("buffer" in buffer) {
    opened_buffer = buffer.buffer
  } else {
    return error({ message: "invalid buffer" })
  }

  // get user
  if (!user) user = await get({ key: opened_buffer.user_key })
  if (!user) {
    user = await getKV(opened_buffer.user_key)
    if (b4a.isBuffer(user)) user = unpack(user)
  }
  if (!user) return error({ message: "user not found or invalid user" })

  // try to open user
  let opened_user: UserT
  if (user?.data) {
    opened_user = decrypt({
      ...user.data,
      key: opened_buffer.master_password,
    })
    if (!opened_user) return error({ message: "invalid master password" })
  } else {
    opened_user = user
  }
  if (!UserS.safeParse(opened_user).success)
    return error({ message: "invalid user" })

  return opened_user
}

export async function convertGuestData({
  guest_user,
  user,
}: {
  guest_user: UserT
  user: UserT
}) {
  // go over each table and copy/paste data to new table

  const tables = ["ais", "appstate", "notepads", "sessions", "user"]
  for (const name of tables) {
    const key = `${guest_user.meta.username}:${name}`
    const data = await getKV(key)
    if (!data) return error({ message: "Guest data not found", data: { key } })
    if (name === "user") {
      data.meta = user.meta
    }
    await setKV(`${user.meta.username}:${name}`, data)
  }
  return true
}
