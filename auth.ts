import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

import { resolveUserFromIdentity } from "@/lib/users"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") {
        return false
      }

      const subject = account.providerAccountId

      if (!subject || !user.email) {
        return false
      }

      const resolvedUser = await resolveUserFromIdentity({
        provider: "google",
        subject,
        name: user.name ?? "",
        email: user.email,
      })

      return resolvedUser !== null
    },
  },
})