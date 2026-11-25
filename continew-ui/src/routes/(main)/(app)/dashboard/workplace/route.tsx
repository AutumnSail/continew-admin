import * as React from 'react'

import { createFileRoute } from '@tanstack/react-router'

import type { WorkbenchRange } from '@/lib/api/workbench'

import { WorkbenchActivity } from './-components/workbench-activity'
import { WorkbenchNotices } from './-components/workbench-notices'
import { WorkbenchReleases } from './-components/workbench-releases'
import { WorkbenchSponsors } from './-components/workbench-sponsors'
import { WorkbenchStars } from './-components/workbench-stars'
import { WorkbenchWelcome } from './-components/workbench-welcome'

/**
 * The workbench: the landing page after sign-in. The Hub panels need `VITE_WORKBENCH_HUB_URL`;
 * the notice panel and the sponsor carousel come from the Admin API and continew.top, so they
 * keep working when the Hub is not configured.
 */
export const Route = createFileRoute('/(main)/(app)/dashboard/workplace')({
  component: Page
})

function Page() {
  const [range, setRange] = React.useState<WorkbenchRange>('30d')

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <WorkbenchWelcome />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <WorkbenchActivity range={range} onRangeChange={setRange} />
          <WorkbenchStars range={range} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <WorkbenchReleases />
          <WorkbenchNotices />
          <WorkbenchSponsors />
        </div>
      </div>
    </div>
  )
}
