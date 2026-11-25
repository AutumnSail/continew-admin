import { createFileRoute, redirect } from '@tanstack/react-router'

import { HOME_PATH } from '@/navigation/route-titles'

/**
 * `/dashboard` is the shell's landing path, so the workbench answers it. The analysis page keeps
 * the charts that used to live here.
 */
export const Route = createFileRoute('/(main)/(app)/dashboard/')({
  beforeLoad: () => redirect({ to: HOME_PATH, replace: true })
})
