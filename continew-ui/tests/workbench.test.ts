import { describe, expect, it, vi } from 'vitest'

import { QueryClient } from '@tanstack/react-query'

import type {
  WorkbenchAuthor,
  WorkbenchChartMeta,
  WorkbenchCommitBucket,
  WorkbenchCommitsResp,
  WorkbenchStarBucket,
  WorkbenchStarsResp
} from '@/lib/api/workbench'
import { workbenchKeys } from '@/lib/query-keys'
import {
  aggregateAuthors,
  authorInitial,
  bucketTotal,
  labelledBuckets,
  resolveAvatarUrl,
  starDomain,
  toCommitBars,
  toLeaderboard,
  toStarPoints,
  windowEndLabel
} from '@/routes/(main)/(app)/dashboard/workplace/-components/workbench-data'

const author = (authorId: string, displayName: string, count: number, avatarUrl: string | null = null) => ({
  authorId,
  displayName,
  count,
  avatarUrl
})

const meta = (overrides: Partial<WorkbenchChartMeta> = {}): WorkbenchChartMeta => ({
  range: '30d',
  window: 'Asia/Shanghai',
  granularity: 'day',
  start: '2026-10-25',
  endExclusive: '2026-11-24',
  updatedAt: '2026-11-24T08:00:00+08:00',
  freshness: 'fresh',
  partialBuckets: [],
  ...overrides
})

describe('toCommitBars', () => {
  it('keeps a bucket with a null detail as a partial zero, and an empty list as a complete zero', () => {
    const buckets: WorkbenchCommitBucket[] = [
      { periodStart: '2026-10-25', authors: [author('linzhou', '林舟', 5), author('alan', '阿岚', 5)] },
      { periodStart: '2026-10-26', authors: [] },
      { periodStart: '2026-10-27', authors: null }
    ]

    const bars = toCommitBars(meta(), buckets)

    expect(bars.map(bar => bar.total)).toEqual([10, 0, 0])
    // `[]` is a complete bucket with no commits; null means the detail is missing.
    expect(bars.map(bar => bar.partial)).toEqual([false, false, true])
    expect(bars.map(bar => bar.label)).toEqual(['10/25', '10/26', '10/27'])
  })

  it('marks a bucket listed in partialBuckets even when it still carries detail', () => {
    const buckets: WorkbenchCommitBucket[] = [
      { periodStart: '2026-10-25', authors: [author('qinghe', '青禾', 2)] },
      { periodStart: '2026-10-26', authors: [author('qinghe', '青禾', 3)] }
    ]

    const bars = toCommitBars(meta({ partialBuckets: ['2026-10-26'] }), buckets)

    // The known subtotal stays, but it must not be read as the bucket's full count.
    expect(bars[0].partial).toBe(false)
    expect(bars[1].partial).toBe(true)
    expect(bars[1].total).toBe(3)
  })

  it('labels month buckets by month instead of by day', () => {
    const bars = toCommitBars(meta({ range: '6m', granularity: 'month' }), [
      { periodStart: '2026-05-01', authors: [author('linzhou', '林舟', 4)] }
    ])

    expect(bars[0].label).toBe('5 月')
  })
})

describe('toStarPoints', () => {
  it('keeps a missing snapshot as null so the line can break, and flags the listed buckets', () => {
    const buckets: WorkbenchStarBucket[] = [
      { periodStart: '2026-05-01', totalStars: 143 },
      { periodStart: '2026-06-01', totalStars: null },
      { periodStart: '2026-07-01', totalStars: 182 }
    ]

    const points = toStarPoints(meta({ range: '6m', granularity: 'month', partialBuckets: ['2026-06-01'] }), buckets)

    expect(points.map(point => point.totalStars)).toEqual([143, null, 182])
    expect(points.map(point => point.partial)).toEqual([false, true, false])
  })

  it('keeps a measured zero distinct from a gap', () => {
    const points = toStarPoints(meta(), [
      { periodStart: '2026-10-25', totalStars: 0 },
      { periodStart: '2026-10-26', totalStars: null }
    ])

    expect(points[0].totalStars).toBe(0)
    expect(points[1].totalStars).toBeNull()
  })
})

describe('aggregateAuthors', () => {
  it('merges buckets by authorId and sorts by the summed count, not by name or order', () => {
    const merged = aggregateAuthors([
      [author('linzhou', '林舟', 5), author('alan', '阿岚', 5)],
      [author('qinghe', '青禾', 2), author('linzhou', '林舟', 1)],
      [author('alan', '阿岚', 6)]
    ])

    expect(merged.map(row => [row.authorId, row.count])).toEqual([
      ['alan', 11],
      ['linzhou', 6],
      ['qinghe', 2]
    ])
  })

  it('separates the same contributor from two buckets by id, not by display name', () => {
    // Two distinct identities that happen to share a display name must stay two rows.
    const merged = aggregateAuthors([[author('a1', '林舟', 1)], [author('a2', '林舟', 2)]])

    expect(merged).toHaveLength(2)
    expect(merged.map(row => row.authorId)).toEqual(['a2', 'a1'])
  })

  it('does not mutate the bucket authors it reads', () => {
    const first = [author('linzhou', '林舟', 5)]
    aggregateAuthors([first, [author('linzhou', '林舟', 1)]])

    expect(first[0].count).toBe(5)
  })
})

describe('labelledBuckets', () => {
  it('labels every month bucket and only spreads day labels, leaving the last two feet apart', () => {
    const days = Array.from({ length: 30 }, (_, index) => ({
      periodStart: `2026-11-${String(index + 1).padStart(2, '0')}`
    }))
    const dayLabels = labelledBuckets(days, '30d')

    expect(dayLabels.has('2026-11-01')).toBe(true)
    expect(dayLabels.has('2026-11-08')).toBe(true)
    expect(dayLabels.has('2026-11-30')).toBe(true)
    // Index 28 would collide with the final label, so the weekly tick is skipped there.
    expect(dayLabels.size).toBe(5)
    expect(labelledBuckets(days, '6m').size).toBe(30)
  })
})

describe('toLeaderboard', () => {
  it('counts linked contributors without the unlinked segment', () => {
    const board = toLeaderboard([
      author('linzhou', '林舟', 5),
      author('unlinked', '未关联账号', 4),
      author('alan', '阿岚', 1)
    ])

    expect(board.total).toBe(10)
    expect(board.contributors).toBe(2)
    expect(board.rows.map(row => row.authorId)).toEqual(['linzhou', 'unlinked', 'alan'])
  })
})

describe('starDomain', () => {
  it('never drops below zero and keeps a flat series visible', () => {
    expect(starDomain([100, null, 0, 120])).toEqual([0, 134])
    expect(starDomain([0, 0])).toEqual([0, 1])
    expect(starDomain([null, null])).toBeNull()
  })
})

describe('resolveAvatarUrl', () => {
  it('resolves a Hub-relative path against the Hub base and leaves absolute URLs alone', () => {
    expect(resolveAvatarUrl('/avatars/linzhou.svg', 'https://admin.continew.top/hub')).toBe(
      'https://admin.continew.top/hub/avatars/linzhou.svg'
    )
    expect(resolveAvatarUrl('avatars/alan.svg', 'https://admin.continew.top/hub/')).toBe(
      'https://admin.continew.top/hub/avatars/alan.svg'
    )
    expect(resolveAvatarUrl('https://avatars.githubusercontent.com/u/1', 'https://admin.continew.top/hub')).toBe(
      'https://avatars.githubusercontent.com/u/1'
    )
  })

  it('resolves a relative Hub base for a same-origin dev proxy', () => {
    expect(resolveAvatarUrl('/avatars/qinghe.svg', '/hub')).toBe('/hub/avatars/qinghe.svg')
  })

  it('returns null for a missing avatar or a missing Hub base', () => {
    expect(resolveAvatarUrl(null, 'https://admin.continew.top/hub')).toBeNull()
    expect(resolveAvatarUrl('/avatars/linzhou.svg', '')).toBeNull()
  })

  it('cannot be talked into another host by extra slashes', () => {
    // A protocol-relative value would otherwise be read as an absolute URL.
    expect(resolveAvatarUrl('//evil.example/a.png', 'https://admin.continew.top/hub')).toBe(
      'https://admin.continew.top/hub/evil.example/a.png'
    )
  })
})

describe('small helpers', () => {
  it('uses the first character of the display name as the avatar fallback', () => {
    expect(authorInitial('林舟')).toBe('林')
    expect(authorInitial('  Alan ')).toBe('A')
    expect(authorInitial('')).toBe('')
  })

  it('sums a bucket and treats a null detail as zero', () => {
    expect(bucketTotal([author('a', 'A', 3), author('b', 'B', 2)])).toBe(5)
    expect(bucketTotal(null)).toBe(0)
    expect(bucketTotal([])).toBe(0)
  })

  it('labels the last day inside the exclusive window end', () => {
    expect(windowEndLabel(meta())).toBe('11/23')
    expect(windowEndLabel(meta({ range: '6m', endExclusive: '2026-11-01' }))).toBe('10/31')
  })
})

const commitResponse = (range: '30d' | '6m'): WorkbenchCommitsResp => ({
  ...meta({ range }),
  buckets: [{ periodStart: '2026-10-25', authors: [author('linzhou', '林舟', 5)] }]
})

const starsResponse = (range: '30d' | '6m'): WorkbenchStarsResp => ({
  ...meta({ range }),
  buckets: [{ periodStart: '2026-10-25', totalStars: 120 }]
})

describe('workbench query keys', () => {
  it('nests the two charts under the requested range and keeps releases range-free', () => {
    expect(workbenchKeys.commits('30d')).toEqual(['workbench', 'commits', '30d'])
    expect(workbenchKeys.stars('6m')).toEqual(['workbench', 'stars', '6m'])
    expect(workbenchKeys.releases()).toEqual(['workbench', 'releases'])
    expect(workbenchKeys.all).toEqual(['workbench'])
  })

  it('serves a cached releases list without refetching when the range changes', async () => {
    // Same freshness rule as the app's query client: data stays fresh, so a revisit does not refetch.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5 * 60_000 } } })
    const fetchReleases = vi.fn(async () => ({ data: { updatedAt: null, freshness: 'fresh' as const, items: [] } }))
    const fetchChart = vi.fn(async (range: '30d' | '6m') => ({ data: commitResponse(range) }))
    const fetchStars = vi.fn(async (range: '30d' | '6m') => ({ data: starsResponse(range) }))

    const range = (next: '30d' | '6m') => [
      client.fetchQuery({ queryKey: workbenchKeys.commits(next), queryFn: () => fetchChart(next) }),
      client.fetchQuery({ queryKey: workbenchKeys.stars(next), queryFn: () => fetchStars(next) }),
      client.fetchQuery({ queryKey: workbenchKeys.releases(), queryFn: fetchReleases })
    ]

    await Promise.all(range('30d'))
    await Promise.all(range('6m'))
    // Back to the first range: the cache answers, so neither chart is fetched again either.
    await Promise.all(range('30d'))

    // Only the two charts follow the range; releases are fetched once for the whole visit.
    expect(fetchChart.mock.calls.map(([next]) => next)).toEqual(['30d', '6m'])
    expect(fetchStars.mock.calls.map(([next]) => next)).toEqual(['30d', '6m'])
    expect(fetchReleases).toHaveBeenCalledTimes(1)
  })
})

describe('author identity binding', () => {
  it('keeps a leaderboard row attached to its authorId across two ranges with different orders', () => {
    const firstRange: WorkbenchAuthor[] = [author('linzhou', '林舟', 2), author('alan', '阿岚', 7)]
    const secondRange: WorkbenchAuthor[] = [author('alan', '阿岚', 1), author('linzhou', '林舟', 9)]

    const first = toLeaderboard(firstRange)
    const second = toLeaderboard(secondRange)

    expect(first.rows[0].authorId).toBe('alan')
    // The leader changes rank, but the row still points at the same identity.
    expect(second.rows[0].authorId).toBe('linzhou')
  })
})
