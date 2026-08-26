"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"

export default function SignInButton() {
  const [loading, setLoading] = useState(false)

  async function handleSignIn() {
    if (loading) return

    setLoading(true)

    try {
      await signIn("google", {
        callbackUrl: "/dashboard",
      })
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      className="primary-button signin-button"
      onClick={handleSignIn}
      disabled={loading}
    >
      {loading ? "Ingresando..." : "Continuar con Google"}
    </button>
  )
}