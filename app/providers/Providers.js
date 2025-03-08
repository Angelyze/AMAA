"use client"; // Mark as Client Component

import { SessionProvider } from "next-auth/react";

export default function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}