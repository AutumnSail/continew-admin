import { getRaw } from '@/lib/http'

/** Statistics period of the two charts; the Hub owns the fixed windows. */
export type WorkbenchRange = '30d' | '6m'

/** `fresh` within the refresh window, `stale` an older snapshot, `unavailable` no snapshot. */
export type WorkbenchFreshness = 'fresh' | 'stale' | 'unavailable'

/** Fields shared by the two chart responses. */
export interface WorkbenchChartMeta {
  /** Echo of the requested range. */
  range: WorkbenchRange
  /** Time zone the buckets are sliced in; the Hub always answers `Asia/Shanghai`. */
  window: string
  granularity: 'day' | 'month'
  /** Inclusive window start, `YYYY-MM-DD`. */
  start: string
  /** Exclusive window end; today and the current month are left out. */
  endExclusive: string
  /** Snapshot build time, not the request time; null when no snapshot exists. */
  updatedAt: string | null
  freshness: WorkbenchFreshness
  /** `periodStart` of buckets whose collection is incomplete or missing entirely. */
  partialBuckets: string[]
}

export interface WorkbenchAuthor {
  /** Stable platform identity; the leaderboard binds to this, never to the display name. */
  authorId: string
  displayName: string
  /** Path relative to the Hub web root, or an absolute URL; null when the platform has none. */
  avatarUrl: string | null
  count: number
}

export interface WorkbenchCommitBucket {
  periodStart: string
  /** null when the bucket has no usable detail, [] when it is complete with no commits. */
  authors: WorkbenchAuthor[] | null
}

export interface WorkbenchCommitsResp extends WorkbenchChartMeta {
  buckets: WorkbenchCommitBucket[]
}

export interface WorkbenchStarBucket {
  periodStart: string
  /** Sum of each repository's star count at the end of the period; null when unmeasured. */
  totalStars: number | null
}

export interface WorkbenchStarsResp extends WorkbenchChartMeta {
  buckets: WorkbenchStarBucket[]
}

/** One formal GitHub release of continew-admin. */
export interface WorkbenchRelease {
  tagName: string
  title: string
  publishedAt: string
  htmlUrl: string
}

export interface WorkbenchReleasesResp {
  updatedAt: string | null
  freshness: WorkbenchFreshness
  /** null when no snapshot exists yet, [] when a complete query matched nothing. */
  items: WorkbenchRelease[] | null
}

/** Body plus the Hub's `X-Data-Source` hint (`mock` while it serves fixtures). */
export interface HubResponse<T> {
  data: T
  source: string | null
}

/**
 * Hub web root: `/hub` in development (same-origin through the Vite proxy, which rewrites the
 * Referer for the Hub's allowlist), an absolute URL in production. Empty in builds without a Hub,
 * which hides the Hub panels instead of firing requests that could only fail.
 */
export const WORKBENCH_HUB_BASE = (import.meta.env.VITE_WORKBENCH_HUB_URL ?? '').trim().replace(/\/+$/, '')

export const isWorkbenchEnabled = WORKBENCH_HUB_BASE.length > 0

const COMMITS_PATH = '/api/workbench/commits'
const STARS_PATH = '/api/workbench/stars'
const RELEASES_PATH = '/api/workbench/releases'

const request = async <T>(path: string, query: Record<string, string> | undefined, signal?: AbortSignal) => {
  // The header is read inside the response hook; a holder keeps its type from narrowing to null.
  const hint: { source: string | null } = { source: null }
  const data = await getRaw<T>(path, {
    baseUrl: WORKBENCH_HUB_BASE,
    query,
    signal,
    onResponse: response => {
      hint.source = response.headers.get('X-Data-Source')
    }
  })

  return { data, source: hint.source }
}

export function getWorkbenchCommits(range: WorkbenchRange, signal?: AbortSignal) {
  return request<WorkbenchCommitsResp>(COMMITS_PATH, { range }, signal)
}

export function getWorkbenchStars(range: WorkbenchRange, signal?: AbortSignal) {
  return request<WorkbenchStarsResp>(STARS_PATH, { range }, signal)
}

/** Releases do not follow the chart period, so this request carries no range. */
export function getWorkbenchReleases(signal?: AbortSignal) {
  return request<WorkbenchReleasesResp>(RELEASES_PATH, undefined, signal)
}

export { workbenchKeys } from '@/lib/query-keys'
