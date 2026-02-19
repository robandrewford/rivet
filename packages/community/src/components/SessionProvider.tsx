"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import { useSessionWatchdog } from "@/lib/session-watchdog"
import type { ReactNode } from "react"

function SessionWatchdog() {
  useSessionWatchdog()
  return null
}

export function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <SessionWatchdog />
      {children}
    </NextAuthSessionProvider>
  )
}
