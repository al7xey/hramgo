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
        name: { label: "Имя", type: "text" },
        mode: { label: "Режим", type: "text" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";
        const name = credentials?.name?.trim().slice(0, 80);
        const mode = credentials?.mode === "register" ? "register" : "login";

        if (!email || password.length < MIN_PASSWORD_LENGTH || (mode === "register" && (!name || name.length < 2))) {
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
              ? await prisma.user.update({ where: { email }, data: { passwordHash, name } })
              : await prisma.user.create({
                  data: {
                    email,
                    passwordHash,
                    name
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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "USER";
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }

      if (trigger === "update" && session?.user) {
        token.name = session.user.name ?? token.name;
        token.email = session.user.email ?? token.email;
        token.picture = session.user.image ?? token.picture;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as string | undefined) ?? "USER";
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
        session.user.image = token.picture ?? session.user.image;
      }

      return session;
    }
  }
};

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
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
