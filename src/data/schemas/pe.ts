import { z } from "zod";

export const ProtocolS = z.object({
  uid: z.string().nonempty(),
  user_id: z.string().nonempty(),
  type: z.string().nonempty(),
})

export const AuthS = z.object({
  c: z.string(),
  s: z.string(),
  pk: z.string(),
})
export type AuthT = z.infer<typeof AuthS>

export const GetBalanceS = ProtocolS.extend({
  auth: AuthS,
  params: z.object({}).optional(),
})
export type GetBalanceT = z.infer<typeof GetBalanceS>

export const GetWalletStatusS = ProtocolS.extend({
  auth: AuthS,
  params: z.object({}).optional(),
})
export type GetWalletStatusT = z.infer<typeof GetWalletStatusS>

export const CreatePaymentIntentS = ProtocolS.extend({
  params: z.object({
    amount: z.number(),
    currency: z.string(),
    payment_method_types: z.array(z.string()),
  }),
})
export type CreatePaymentIntentT = z.infer<typeof CreatePaymentIntentS>

export const CreateCheckoutSessionS = ProtocolS.extend({
  params: z.object({
    price_id: z.string(),
    domain: z.string(),
  }),
})
export type CreateCheckoutSessionT = z.infer<typeof CreateCheckoutSessionS>