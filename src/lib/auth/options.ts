import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { prisma } from "@/lib/db/prisma";

const MIN_PASSWORD_LENGTH = 6;

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "Email и пароль",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
        mode: { label: "Режим", type: "text" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";
        const mode = credentials?.mode === "register" ? "register" : "login";

        if (!email || password.length < MIN_PASSWORD_LENGTH) {
          return null;
        }

        try {
          const existingUser = await prisma.user.findUnique({ where: { email } });

          if (mode === "register") {
            if (existingUser?.passwordHash) {
              return null;
            }

            const passwordHash = hashPassword(password);
            const user = existingUser
              ? await prisma.user.update({ where: { email }, data: { passwordHash } })
              : await prisma.user.create({
                  data: {
                    email,
                    passwordHash,
                    name: email.split("@")[0]
                  }
                });

            return toSessionUser(user);
          }

          if (!existingUser?.passwordHash || !verifyPassword(password, existingUser.passwordHash)) {
            return null;
          }

          return toSessionUser(existingUser);
        } catch {
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "USER";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as string | undefined) ?? "USER";
      }

      return session;
    }
  }
};

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");

  if (!salt || !hash) {
    return false;
  }

  const candidate = Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");
  const expected = Buffer.from(hash, "hex");

  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function toSessionUser(user: {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: string;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role
  };
}
