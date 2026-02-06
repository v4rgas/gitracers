import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      authorization: { params: { scope: "read:user repo" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.access_token) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (token as any).accessToken = account.access_token;
      }
      if (profile) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (token as any).githubLogin = (profile as any).login as string;
      }
      return token;
    },
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session.accessToken = (token as any).accessToken as string | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session.user.login = (token as any).githubLogin as string | undefined;
      session.user.id = token.sub!;
      return session;
    },
  },
});
