import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * `/dashboard` is the shell's landing path, so the workbench answers it. The analysis page keeps
 * the charts that used to live here.
 */
export const Route = createFileRoute('/(main)/(app)/dashboard/')({
  beforeLoad: () => redirect({ to: '/dashboard/workplace', replace: true })
})
