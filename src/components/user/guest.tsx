import { UserT } from "@/data/loaders/user"
import { UserS } from "@/data/schemas/user"
import { setActiveUser } from "@/libraries/active_user"
import { createUser } from "@/libraries/auth"
import { ph } from "@/libraries/logging"
import { nanoid } from "nanoid"
import { useEffect } from "react"
import { useAuth } from "@/components/hooks/useAuth"
import { useNavigate } from "react-router-dom"
import { set as setLS } from "@/data/storage/localStorage"

export function Guest() {
  useEffect(() => {
    // create guest user
    createGuestUser()
  }, [])

  let auth = useAuth()

  const navigate = useNavigate()

  async function createGuestUser() {
    setLS({ key: "guest-mode", value: "yes" })
    const username = `guest-${nanoid(10)}`
    const password = nanoid(10)
    const reminder = nanoid(10)
    const created_user = await createUser({ username, password, reminder, guest: true })

    if (!created_user || !UserS.safeParse(created_user.user).success) return null
    await setActiveUser(created_user.user as UserT)
    setTimeout(() => {
      auth.signin({ username: created_user.user.meta?.username || username, password }, () => {
        ph().capture("auth/_guest_session")
        navigate("/conductor/")
      })
    }, 200)
  }

  return (
    <div
      className="dark bg-black"
      style={{
        background: "linear-gradient(41deg, rgba(29,29,32,1) 0%, rgba(36,36,40,1) 100%)",
        color: "white",
      }}
    >
      <div
        style={{
          position: "fixed",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div>
          <svg
            style={{ opacity: 0.1 }}
            width="200"
            height="200"
            viewBox="0 0 19 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="16.4783"
              y="16.6017"
              width="3"
              height="3"
              rx="1.5"
              transform="rotate(45 16.4783 16.6017)"
              fill="white"
            />
            <rect
              x="0.0100098"
              y="18.7552"
              width="14.2025"
              height="3"
              rx="1.5"
              transform="rotate(-45 0.0100098 18.7552)"
              fill="white"
            />
            <rect
              x="2.12134"
              y="0.778198"
              width="14.2025"
              height="3"
              rx="1.5"
              transform="rotate(45 2.12134 0.778198)"
              fill="white"
            />
          </svg>
        </div>
        <div
          style={{
            fontFamily:
              "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
            fontSize: "24px",
            color: "#ffffff10",
          }}
        >
          Loading...
        </div>
      </div>
    </div>
  )
}
