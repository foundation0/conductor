import { useLocation, useNavigate, useLoaderData, Link } from "react-router-dom"
import { useAuth } from "@/components/hooks/useAuth"
import { fieldFocus } from "../libraries/fieldFocus"
import { useEffect, useState } from "react"
import { BiRightArrowAlt } from "react-icons/bi"
import _ from "lodash"
import { HiPlus } from "react-icons/hi"
import PromptIcon from "@/assets/prompt.svg"
import { UsersT } from "@/data/loaders/users"
import { PublicUserS } from "@/data/schemas/user"
import { z } from "zod"
import { HiOutlineTrash } from "react-icons/hi"
import UsersActions from "@/data/actions/users"

export function LoginPage() {
  let { users_state } = useLoaderData() as { users_state: UsersT }
  let navigate = useNavigate()
  let location = useLocation()
  let auth = useAuth()

  let [users, setUsers] = useState<any[]>(
    _(Object.keys(users_state))
      .map((k) => users_state[k])
      .orderBy("last_login", "asc")
      .reverse()
      .value() || []
  )

  let [active_user, setActiveUser] = useState<z.infer<typeof PublicUserS>>(_.first(users))

  useEffect(() => {
    setUsers(
      _(Object.keys(users_state))
        .map((k) => users_state[k])
        .orderBy("last_login", "asc")
        .reverse()
        .value()
    )
  }, [JSON.stringify(users_state)])

  let from = location.state?.from?.pathname || "/conductor/"

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    let formData = new FormData(event.currentTarget)
    let password = formData.get("password") as string

    auth.signin({ username: active_user.username, password }, () => {
      navigate(from, { replace: true })
    })
  }

  // set focus to input
  useEffect(() => {
    setTimeout(() => {
      fieldFocus({ selector: "#authentication_password" })
    }, 500)

    window.addEventListener("focus", () => {
      setTimeout(() => {
        fieldFocus({ selector: "#authentication_password" })
      }, 200)
    })

    return () => {
      window.removeEventListener("focus", () => {})
    }
  }, [])

  // if no users on device, redirect to onboarding
  useEffect(() => {
    if (users.length === 0) {
      navigate("/onboarding", { replace: true })
    }
  }, [users])

  function getPhoto({ id }: { id: string }) {
    return ""
  }

  async function useSensor() {
    /* 
    TODO: Figure out how to do this without a server

    const challenge = "56535b13-5d93-4194-a282-f234c1c24500"

    const registration = await client.register(active_user.username, challenge, {
      authenticatorType: "auto",
      userVerification: "required",
      timeout: 60000,
      attestation: false,
      debug: false,
    })

    const expected_reg = {
      challenge, // whatever was randomly generated by the server
      origin: "http://localhost:5173",
    }
    const registrationParsed = await server.verifyRegistration(registration, expected_reg)
    console.log('reg', registrationParsed)
    
    const credential = {
      id: "2NoXAuvK6euNMkQhPGWHXCZNABKZVO-Z5fKjwb2j44o",
      publicKey:
        "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAywDcAnChlHhotliM8JshK8ffZtMdGxtg3nsIhuH44GdNWMGX88HPsV67FxZPV7frHRkgT-fRMVZ97dVcFn2qWeTGq1vmCW9ETZ64GXt_JOr86uxyirdfubx-PDQi-bhz6c6w_2q03ZBi-QRn-wWS2glMmmSFRxqevFQGkZYdSQVSZuDbvZXhYJfq97jm0Lh3n5vXWkNpczWTr5g1EZKhuOScHmkRS_SCXuYFLe3y00eN-_tnqH0v8Kh_B7yX4DuK6GER4kZsc0WVgW1QOtCOgozPP88PkjQTyCOZLtKY8EEwPMXjOEbwmSVM_20mjVVoh63I7t9OTuDnJTI5bpyunwIDAQAB",
      algorithm: "RS256",
    } as CredentialKey
    const authentication = await client.authenticate([credential.id], challenge, {
      authenticatorType: "auto",
      userVerification: "required",
      timeout: 60000,
    })

    const expected = {
      challenge, // whatever was randomly generated by the server.
      origin: "http://localhost:5173",
      userVerified: true, // should be set if `userVerification` was set to `required` in the authentication options (default)
      counter: 0, // for enhanced security, you can store the number of times this authenticator was used and ensure it increases each time
    }
    const authenticationParsed = await server.verifyAuthentication(authentication, credential, expected)
    console.log("auth", authenticationParsed) */
  }

  return (
    <div className="flex flex-col h-full bg-zinc-800">
      <div className="flex ml-4 mt-4 items-center">
        <img className="w-4 h-4 opacity-60" src={PromptIcon} />
        <div className="text-xs ml-2">{users?.length > 0 ? "Welcome back." : "Welcome, let's get you started."}</div>
      </div>

      <div className="flex flex-1 h-full justify-center items-center ">
        {users?.length > 0 ? (
          <form className="flex flex-col justify-center items-center " onSubmit={handleSubmit}>
            <div className="flex flex-col justify-center items-center mb-2">
              <div className="flex w-20 h-20 rounded-full bg-zinc-900/30 border-t border-t-zinc-700 justify-center items-center overflow-hidden">
                {active_user?.profile_photos?.length || 0 > 0 ? (
                  <img src={getPhoto({ id: _.first(active_user?.profile_photos) || "" })} className="h-full w-full" />
                ) : (
                  active_user.name.slice(0, 1)
                )}
              </div>
              <div className="text-sm font-semibold">{active_user.name}</div>
            </div>
            <div className="flex flex-row">
              <label className="flex flex-row backdrop-blur bg-zinc-700/30 bg-opacity-80 border border-zinc-900 border-t-zinc-700 rounded-lg items-center">
                <input
                  className="flex flex-1 p-4 py-3 bg-transparent text-xs border-0 rounded  placeholder-zinc-400 text-zinc-300 outline-none focus:outline-none ring-0 shadow-transparent input"
                  name="password"
                  type="password"
                  placeholder="Type your password"
                  id="authentication_password"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="lex inset-y-0 right-0 m-1 focus:outline-none font-medium rounded-lg text-sm px-2 text-zinc-400 hover:text-zinc-200 py-2 saturate-50 hover:saturate-100 animate"
                >
                  <BiRightArrowAlt className="w-5 h-5" />
                </button>
              </label>{" "}
              {/* {typeof PublicKeyCredential !== "undefined" ? (
                <div className="flex flex-row justify-center items-center">
                  <div
                    onClick={() => useSensor()}
                    className="bg-zinc-700/30 border border-zinc-900  border-t-zinc-700/70 rounded-md p-3 ml-2 h-full btn-square cursor-pointer text-zinc-400 hover:text-zinc-200"
                  >
                    <IoFingerPrintOutline className="  h-full w-full" />
                  </div>
                </div>
              ) : null} */}
            </div>
            {/* {typeof PublicKeyCredential !== "undefined" ? (
              <div className="my-2">
                <div className="text-xs text-zinc-400/90">
                  <kbd className="kbd kbd-xs">Alt</kbd> + <kbd className="kbd kbd-xs">X</kbd> fingerprint
                </div>
              </div>
            ) : null} */}
            <div className="my-10 flex flex-col w-full gap-2">
              {_(users)
                .reject((u) => u.id === active_user.id)
                .map((user) => {
                  return (
                    <div
                      key={user.id}
                      onClick={() => {
                        setActiveUser(user)
                        setTimeout(() => {
                          fieldFocus({ selector: "#authentication_password" })
                        }, 200)
                      }}
                      className="flex flex-row bg-zinc-700/30 hover:bg-zinc-700/70 border border-zinc-900  border-t-zinc-700/70 rounded-md flex-1 p-3 cursor-pointer hover:text-zinc-200"
                    >
                      <div className="flex w-8 h-8 rounded-full bg-zinc-900/30 border-t border-t-zinc-700 justify-center items-center overflow-hidden text-zinc-500 font-bold font-xs">
                        {user.profile_photos?.length > 0 ? (
                          <img src={user.profile_photos[0]} className="h-full w-full" />
                        ) : (
                          user.name.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div className="flex items-center text-xs ml-2">{user.name}</div>
                      <div className="flex flex-grow justify-end items-center gap-3">
                        <div className="w-4 h-4 tooltip tooltip-top" data-tip="Delete account from this device">
                          <HiOutlineTrash
                            className="w-4 h-4 text-zinc-500 hover:text-red-700 "
                            onClick={() => {
                              confirm("Are you sure you want to remove this account from this device?")
                                ? UsersActions.removeUser({ id: user.id })
                                : null
                              navigate("/login")
                              }
                            }
                          />
                        </div>
                        <BiRightArrowAlt className="w-5 h-5" />
                      </div>
                    </div>
                  )
                })
                .value()}
              <div className=" flex flex-col w-full gap-2">
                <Link to="/onboarding">
                  <div
                    onClick={() => {}}
                    className="flex flex-row bg-zinc-800/30 hover:bg-zinc-900/70 border border-dashed border-zinc-700  border-t-zinc-600/70 rounded-md flex-1 p-3 cursor-pointer text-zinc-500 hover:text-zinc-200"
                  >
                    <div className="flex w-8 h-8 rounded-full bg-zinc-700/30  justify-center items-center overflow-hidden text-zinc-500 font-semibold">
                      <HiPlus className="w-3 h-3 " />
                    </div>
                    <div className="flex items-center text-xs ml-2">Create new user</div>
                    <div className="flex flex-grow justify-end items-center">
                      <BiRightArrowAlt className="w-5 h-5" />
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}