import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/db";
import { verifyPasswordHash } from "@/lib/auth/password";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  pages: {
    signIn: "/dashboard/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!email || !password) {
          return null;
        }

        const admin = await prisma.adminUser.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
          },
        });

        if (!admin) {
          return null;
        }

        const passwordMatches = await verifyPasswordHash({
          password,
          passwordHash: admin.passwordHash,
        });

        if (!passwordMatches) {
          return null;
        }

        return {
          id: admin.id,
          email: admin.email,
          mfaVerified: false,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, trigger, session, user }) {
      if (user) {
        token.adminId = user.id;
        token.email = typeof user.email === "string" ? user.email : "";
        token.mfaVerified = false;
      }

      if (trigger === "update" && session?.user?.mfaVerified === true) {
        token.mfaVerified = true;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.adminId) {
        session.user.id = String(token.adminId);
        session.user.mfaVerified = Boolean(token.mfaVerified);
      }

      return session;
    },
  },
});
