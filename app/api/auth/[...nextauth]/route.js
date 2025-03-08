import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import TwitterProvider from "next-auth/providers/twitter";
import { get } from '@vercel/edge-config';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      version: "2.0",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Check if user exists in database and is premium
      try {
        const premiumUsers = await get('premium_users') || [];
        user.isPremium = premiumUsers.includes(user.email);
        console.log(`User ${user.email} is premium: ${user.isPremium}`);
        
        return true; // Allow sign in for all users
      } catch (error) {
        console.error("Edge Config error:", error);
        // Fallback to hardcoded premium user
        user.isPremium = user.email === "ahorva33@gmail.com";
        return true;
      }
    },
    async session({ session, token }) {
      session.user.isPremium = token.isPremium || false;
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.isPremium = user.isPremium || false;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };