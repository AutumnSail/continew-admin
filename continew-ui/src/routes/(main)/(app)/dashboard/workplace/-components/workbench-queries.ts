import { queryOptions } from '@tanstack/react-query'

import {
  getWorkbenchCommits,
  getWorkbenchReleases,
  getWorkbenchStars,
  isWorkbenchEnabled,
  type WorkbenchRange
} from '@/lib/api/workbench'
import { workbenchKeys } from '@/lib/query-keys'

/**
 * The two charts follow the shared range switch, so their keys carry it. Releases are keyed
 * without a range: the Hub sorts them by publish date and ignores the period, so switching the
 * range reuses the cached list instead of fetching it again.
 */
export const commitsQueryOptions = (range: WorkbenchRange) =>
  queryOptions({
    queryKey: workbenchKeys.commits(range),
    queryFn: ({ signal }) => getWorkbenchCommits(range, signal),
    enabled: isWorkbenchEnabled
  })

export const starsQueryOptions = (range: WorkbenchRange) =>
  queryOptions({
    queryKey: workbenchKeys.stars(range),
    queryFn: ({ signal }) => getWorkbenchStars(range, signal),
    enabled: isWorkbenchEnabled
  })

export const releasesQueryOptions = () =>
  queryOptions({
    queryKey: workbenchKeys.releases(),
    queryFn: ({ signal }) => getWorkbenchReleases(signal),
    enabled: isWorkbenchEnabled
  })
