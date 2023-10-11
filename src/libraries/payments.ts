import config from "@/config"
import { CreateCheckoutSessionT } from "@/data/schemas/pe"
import { nanoid } from "nanoid"

export async function buyCreditsWithStripe({ user_id }: { user_id: string }) {
  const checkout_payload: CreateCheckoutSessionT = {
    uid: nanoid(),
    user_id,
    type: "CreateCheckoutSession",
    params: {
      domain: window.location.origin,
      price_id: import.meta.env.PROD ? "price_1NdrXhIux4MUqWVpltKqcQ0D" : "price_1NdsxOIux4MUqWVpOEWZ0jTC",
    },
  }

  // Create the PaymentIntent and obtain clientSecret from your server endpoint
  const res = await fetch(`${config.services.wallet_URI}/PE`, {
    method: "POST",
    body: JSON.stringify(checkout_payload),
  })

  const { session, error } = await res.json()
  if(error) return { error }
  window.location.href = session.url

}
