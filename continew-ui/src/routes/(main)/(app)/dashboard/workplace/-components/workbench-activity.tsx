import * as React from 'react'

import { useQuery } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'

import { QueryState } from '@/components/query-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from 'cn'
import { isWorkbenchEnabled, type WorkbenchAuthor, type WorkbenchRange, WORKBENCH_HUB_BASE } from '@/lib/api/workbench'

import {
  aggregateAuthors,
  authorInitial,
  authorShades,
  barAxis,
  labelledBuckets,
  resolveAvatarUrl,
  toCommitBars,
  toLeaderboard,
  UNLINKED_AUTHOR_ID
} from './workbench-data'
import { commitsQueryOptions } from './workbench-queries'

const RANGE_ITEMS = [
  { value: '30d', label: '近 30 天' },
  { value: '6m', label: '近 6 个月' }
] as const

/** The period switch both charts share; it rides on the commits card, the page's top panel. */
export function WorkbenchRangeSwitch({
  range,
  onChange
}: {
  readonly range: WorkbenchRange
  readonly onChange: (range: WorkbenchRange) => void
}) {
  return (
    <ToggleGroup
      aria-label="统计周期"
      variant="outline"
      size="sm"
      spacing={0}
      value={[range]}
      onValueChange={([next]) => {
        if (next === '30d' || next === '6m') {
          onChange(next)
        }
      }}
    >
      {RANGE_ITEMS.map(item => (
        <ToggleGroupItem
          key={item.value}
          value={item.value}
          className="px-2.5 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
        >
          {item.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function AuthorRow({ author, shade }: { author: WorkbenchAuthor; shade?: string }) {
  const avatar = resolveAvatarUrl(author.avatarUrl, WORKBENCH_HUB_BASE)
  const unlinked = author.authorId === UNLINKED_AUTHOR_ID

  return (
    <li className="flex min-h-8 items-center gap-2 py-0.5">
      <Avatar size="sm" className="border" style={shade ? { borderColor: shade } : undefined}>
        {avatar && !unlinked ? <AvatarImage src={avatar} alt="" /> : null}
        <AvatarFallback className="text-[11px]">{authorInitial(author.displayName)}</AvatarFallback>
      </Avatar>
      <span className={cn('min-w-0 flex-1 truncate text-sm', unlinked && 'text-muted-foreground')}>
        {author.displayName}
      </span>
      <span className="shrink-0 text-sm font-medium tabular-nums">
        {author.count}
        <span className="ml-0.5 text-xs font-normal text-muted-foreground">次</span>
      </span>
    </li>
  )
}

/**
 * Commit chart with the leaderboard beside it. A click on a bar narrows the leaderboard to that
 * bucket without another request: the bucket already carries its authors, keyed by `authorId`.
 */
export function WorkbenchActivity({
  range,
  onRangeChange
}: {
  readonly range: WorkbenchRange
  readonly onRangeChange: (range: WorkbenchRange) => void
}) {
  // The selection is a `periodStart`, not an index: the two ranges have different bucket lists.
  const [selectedStart, setSelectedStart] = React.useState<string | null>(null)
  const query = useQuery(commitsQueryOptions(range))

  // Day and month buckets can share a period start (`2026-10-01`), so a selection left over from
  // the other range would silently point at a different period. Drop it whenever the range moves.
  const [selectedRange, setSelectedRange] = React.useState(range)
  if (selectedRange !== range) {
    setSelectedRange(range)
    setSelectedStart(null)
  }

  const meta = query.data?.data
  // The projection is derived from the response, so it only changes when the response does.
  const bars = React.useMemo(() => (meta ? toCommitBars(meta, meta.buckets) : []), [meta])
  const selected = bars.find(bar => bar.periodStart === selectedStart)
  const shades = React.useMemo(() => authorShades(bars.map(bar => bar.authors)), [bars])

  const axis = barAxis(bars.map(bar => bar.total))
  const labels = labelledBuckets(bars, range)

  // The chart total always describes the whole window; the leaderboard follows the selection.
  const windowAuthors = aggregateAuthors(bars.map(bar => bar.authors))
  const windowTotal = windowAuthors.reduce((sum, author) => sum + author.count, 0)
  const leaderboard = toLeaderboard(selected ? selected.authors : windowAuthors)
  const partial = selected ? selected.partial : bars.some(bar => bar.partial)
  const isSample = query.data?.source === 'mock'

  const selectBar = (periodStart: string) => setSelectedStart(current => (current === periodStart ? null : periodStart))

  return (
    <Card className="@container/activity">
      <CardHeader>
        <CardTitle>近期提交</CardTitle>
        <CardDescription>
          <span className="hidden @[520px]/activity:block">Open ContiNew 公开仓库的提交次数</span>
          <span className="@[520px]/activity:hidden">公开仓库提交次数</span>
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          {isSample ? (
            <Badge variant="outline" className="text-muted-foreground">
              示例数据
            </Badge>
          ) : null}
          <WorkbenchRangeSwitch range={range} onChange={onRangeChange} />
        </CardAction>
      </CardHeader>

      <CardContent>
        {!isWorkbenchEnabled ? (
          <QueryState state="empty" className="h-52" title="未配置工作台数据源" />
        ) : query.isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : query.isError ? (
          <QueryState state="error" className="h-64" onRetry={() => void query.refetch()} />
        ) : bars.length === 0 ? (
          <QueryState state="empty" className="h-64" title="暂无提交数据" />
        ) : (
          <div className="grid grid-cols-1 gap-4 @[560px]/activity:grid-cols-[minmax(0,1.6fr)_minmax(180px,1fr)] @[560px]/activity:gap-5">
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium">{range === '6m' ? '每月提交次数' : '每日提交次数'}</h3>
                <span className="text-xs text-muted-foreground tabular-nums">合计 {windowTotal} 次</span>
              </div>

              <div className="mt-3 flex gap-1.5">
                <div className="relative h-40 w-7 shrink-0 text-[10px] text-muted-foreground tabular-nums">
                  {/* Both gridline values sit on their lines, so the top one never leans into the heading. */}
                  <span className="absolute top-0 right-0 -translate-y-1/2">{axis.max}</span>
                  <span className="absolute top-1/2 right-0 -translate-y-1/2">{axis.half}</span>
                  <span className="absolute top-full right-0 -translate-y-1/2">0</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="relative h-40 border-b">
                    <div className="absolute inset-x-0 top-1/2 border-t border-dashed opacity-60" />
                    <div
                      className="grid h-full grid-rows-1"
                      style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
                    >
                      {bars.map(bar => {
                        const active = bar.periodStart === selectedStart
                        const height = axis.max > 0 ? (bar.total / axis.max) * 100 : 0

                        return (
                          <button
                            key={bar.periodStart}
                            type="button"
                            aria-pressed={active}
                            onClick={() => selectBar(bar.periodStart)}
                            title={`${bar.periodStart}｜${bar.total} 次提交${bar.partial ? '（部分数据）' : ''}`}
                            className={cn(
                              'group relative flex h-full min-w-0 flex-col justify-end px-0.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                              active ? 'bg-primary/10' : 'hover:bg-muted/60'
                            )}
                          >
                            <span
                              className={cn(
                                'flex w-full flex-col-reverse overflow-hidden rounded-t-xs',
                                bar.partial && 'opacity-50'
                              )}
                              style={{ height: `${height}%` }}
                            >
                              {bar.authors.map(author => (
                                <span
                                  key={author.authorId}
                                  className="w-full"
                                  // A flex-grow share of the bar's height, so segments split by count.
                                  style={{
                                    flexGrow: author.count,
                                    flexBasis: 0,
                                    backgroundColor: shades.get(author.authorId)
                                  }}
                                />
                              ))}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div
                    className="mt-1 grid text-[10px] whitespace-nowrap text-muted-foreground"
                    style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
                  >
                    {bars.map((bar, index) => (
                      <span
                        key={bar.periodStart}
                        className={cn(
                          index === 0 && 'text-left',
                          index === bars.length - 1 ? 'text-right' : 'text-center'
                        )}
                      >
                        {labels.has(bar.periodStart) ? bar.label : null}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                {partial
                  ? '半透明柱为采集不全的周期，只反映已知小计。'
                  : '选中柱子查看该周期的贡献明细，再次点击取消。'}
              </p>
            </div>

            <section
              aria-label="贡献榜"
              className="min-w-0 border-t pt-3 @[560px]/activity:border-t-0 @[560px]/activity:border-l @[560px]/activity:pt-0 @[560px]/activity:pl-5"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">贡献榜</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs text-muted-foreground"
                  disabled={!selected}
                  onClick={() => setSelectedStart(null)}
                >
                  <RotateCcw />
                  重置筛选
                </Button>
              </div>

              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{selected ? selected.label : '全部周期'}</span>
                <span className="tabular-nums">
                  {leaderboard.total} 次提交 · {leaderboard.contributors} 位贡献者
                </span>
                {partial ? <Badge variant="secondary">部分数据</Badge> : null}
              </p>

              {leaderboard.rows.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  {/* A partial bucket may simply not have been collected, so it is not "no commits". */}
                  {partial ? '该周期暂无可用提交明细' : '该周期没有提交'}
                </p>
              ) : (
                <ol className="mt-2 max-h-52 overflow-y-auto">
                  {leaderboard.rows.map(author => (
                    <AuthorRow key={author.authorId} author={author} shade={shades.get(author.authorId)} />
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
