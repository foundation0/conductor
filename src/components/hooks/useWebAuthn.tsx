export type WebAuth = {
  rpName: string
  rpId: string
  credentialOpt?: PublicKeyCredentialCreationOptions
  assertionOpt?: PublicKeyCredentialRequestOptions
}

type CredentialOpt = {
  userId: string
  userName: string
  userDisplayName: string
  challenge: string
}

type AssertionOpt = { challenge: string }

export function useWebAuthn({ rpName, rpId, credentialOpt, assertionOpt }: WebAuth) {
  const getCredential = async ({ userId, userName, userDisplayName, challenge }: CredentialOpt) => {
    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      rp: { name: rpName, id: rpId },
      user: {
        id: new Uint8Array(userId.length).map((_, i) => userId.charCodeAt(i)),
        name: userName,
        displayName: userDisplayName,
      },
      challenge: new Uint8Array(challenge.length).map((_, i) => challenge.charCodeAt(i)),
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      timeout: 60000,
      excludeCredentials: [],
      authenticatorSelection: { authenticatorAttachment: "platform",residentKey: 'preferred', requireResidentKey: false, userVerification: 'required' },
      attestation: "none",
      extensions: { credProps: true },
      ...credentialOpt,
    }

    return await navigator.credentials.create({ publicKey: publicKeyCredentialCreationOptions })
  }

  const getAssertion = async ({ challenge }: AssertionOpt) => {
    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge: new Uint8Array(challenge.length).map((_, i) => challenge.charCodeAt(i)),
      allowCredentials: [],
      rpId: rpId,
      timeout: 60000,
      userVerification: "required",
      ...assertionOpt,
    }

    return await navigator.credentials.get({ publicKey: publicKeyCredentialRequestOptions })
  }

  return { getCredential, getAssertion } as const
}
