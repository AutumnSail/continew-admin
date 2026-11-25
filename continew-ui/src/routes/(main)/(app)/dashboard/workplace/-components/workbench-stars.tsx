import { useQuery } from '@tanstack/react-query'

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'

import { QueryState } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { isWorkbenchEnabled, type WorkbenchRange } from '@/lib/api/workbench'

import { labelledBuckets, starDomain, toStarPoints } from './workbench-data'
import { starsQueryOptions } from './workbench-queries'

const chartConfig = {
  totalStars: {
    label: 'Star 总数',
    color: 'var(--chart-3)'
  }
} satisfies ChartConfig

/**
 * Star trend of all public repositories. `totalStars` is each repository's end-of-period count
 * added up, not a daily increment; a null bucket breaks the line instead of interpolating.
 */
export function WorkbenchStars({ range }: { readonly range: WorkbenchRange }) {
  const query = useQuery(starsQueryOptions(range))
  const meta = query.data?.data

  const points = meta ? toStarPoints(meta, meta.buckets) : []
  const labelled = labelledBuckets(points, range)
  const measured = points.filter(point => point.totalStars !== null)
  const latest = measured.at(-1)
  const domain = starDomain(points.map(point => point.totalStars))
  const gaps = points.filter(point => point.totalStars === null)
  // A gap the Hub forgot to list is still incomplete data, so the badge must not depend on the list alone.
  const partial = gaps.length > 0 || points.some(point => point.partial)
  const isSample = query.data?.source === 'mock'

  return (
    <Card className="@container/stars">
      <CardHeader>
        <CardTitle>Star 趋势</CardTitle>
        <CardDescription>
          {meta && latest ? <>截至 {latest.label} · 公开仓库 Star 总数</> : '公开仓库 Star 总数'}
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          {isSample ? (
            <Badge variant="outline" className="text-muted-foreground">
              示例数据
            </Badge>
          ) : null}
          {partial ? <Badge variant="secondary">部分数据</Badge> : null}
          {typeof latest?.totalStars === 'number' ? (
            <span className="text-lg font-semibold tabular-nums">{latest.totalStars.toLocaleString('zh-CN')}</span>
          ) : null}
        </CardAction>
      </CardHeader>

      <CardContent>
        {!isWorkbenchEnabled ? (
          <QueryState state="empty" className="h-40" title="未配置工作台数据源" />
        ) : query.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : query.isError ? (
          <QueryState state="error" className="h-40" onRetry={() => void query.refetch()} />
        ) : measured.length === 0 ? (
          <QueryState
            state="empty"
            className="h-40"
            title={gaps.length > 0 ? '所选周期暂无 Star 快照' : '暂无 Star 数据'}
          />
        ) : (
          <ChartContainer config={chartConfig} debounce={220} className="aspect-auto h-40 w-full">
            <LineChart accessibilityLayer data={points} margin={{ top: 8, right: 22, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} strokeOpacity={0.5} />
              <XAxis
                dataKey="periodStart"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                interval={0}
                tick={{ fontSize: 10 }}
                tickFormatter={(value: string) =>
                  labelled.has(value) ? (points.find(point => point.periodStart === value)?.label ?? '') : ''
                }
              />
              <YAxis
                width={36}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                domain={domain ? [domain[0], domain[1]] : ['auto', 'auto']}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(_value, payload) => {
                      const point = payload?.[0]?.payload as { periodStart?: string } | undefined
                      return point?.periodStart ? `${point.periodStart}｜Star 总数` : 'Star 总数'
                    }}
                  />
                }
              />
              <Line
                dataKey="totalStars"
                type="monotone"
                stroke="var(--color-totalStars)"
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
                // A bucket without a snapshot keeps its slot but must not be bridged.
                connectNulls={false}
              />
            </LineChart>
          </ChartContainer>
        )}

        {gaps.length > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            缺失快照的周期折线断开：
            {gaps
              .map(point => point.label)
              .slice(0, 6)
              .join('、')}
            {gaps.length > 6 ? ' 等' : ''}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
