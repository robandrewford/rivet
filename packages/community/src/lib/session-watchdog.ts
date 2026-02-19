"use client"

import { useSession, signIn } from "next-auth/react"
import { useEffect } from "react"

const CHECKPOINT_KEY = "gdai:workflow-checkpoint"

export function useSessionWatchdog() {
  const { data: session } = useSession()
  useEffect(() => {
    if (session?.error === "RefreshTokenError") {
      try {
        const state = captureWorkflowState()
        if (state) sessionStorage.setItem(CHECKPOINT_KEY, JSON.stringify(state))
      } catch { /* sessionStorage unavailable */ }
      signIn("azure-ad", { callbackUrl: window.location.href })
    }
  }, [session?.error])
}

function captureWorkflowState(): Record<string, unknown> | null {
  // Phase 2+: serialize DAG state, active node, form inputs
  // Phase 1: URL only
  return { url: window.location.href, timestamp: Date.now() }
}

export function restoreWorkflowState(): Record<string, unknown> | null {
  try {
    const raw = sessionStorage.getItem(CHECKPOINT_KEY)
    if (!raw) return null
    sessionStorage.removeItem(CHECKPOINT_KEY)
    return JSON.parse(raw) as Record<string, unknown>
  } catch { return null }
}
