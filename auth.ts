import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

import { getUserAuthorization } from "@/lib/authorization"
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

      if (!resolvedUser) {
        return false
      }

      const authorization =
        await getUserAuthorization(resolvedUser)

      user.id = resolvedUser.id
      user.roleId = authorization.roleId
      user.permissions = authorization.permissions

      return true
    },

    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.roleId = user.roleId
        token.permissions = user.permissions
      }

      return token
    },

    async session({ session, token }) {
      if (
        token.userId &&
        token.roleId &&
        token.permissions
      ) {
        session.user.id = token.userId
        session.user.roleId = token.roleId
        session.user.permissions = token.permissions
      }

      return session
    },
  },
})