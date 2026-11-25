import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Tag } from 'lucide-react'

import { QueryState } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { isWorkbenchEnabled } from '@/lib/api/workbench'
import { PROJECT_LINKS } from '@/navigation/route-titles'

import { releaseDate, releaseTitle, safeHttpUrl, snapshotTime } from './workbench-data'
import { releasesQueryOptions } from './workbench-queries'

/**
 * The latest formal releases, straight from the Hub; the news does not follow the chart period.
 *
 * `htmlUrl` comes from a remote payload, so it is checked before it becomes an href: a malformed
 * or non-http(s) value links to the releases page instead of wherever it points.
 */
export function WorkbenchReleases() {
  const query = useQuery(releasesQueryOptions())
  const data = query.data?.data
  const items = data?.items ?? null
  const updated = snapshotTime(data?.updatedAt ?? null)
  const isSample = query.data?.source === 'mock'

  return (
    <Card>
      <CardHeader>
        <CardTitle>更新日志</CardTitle>
        <CardDescription>{updated ? `快照 ${updated}` : 'ContiNew Admin 正式发布'}</CardDescription>
        <CardAction className="flex items-center gap-2">
          {isSample ? (
            <Badge variant="outline" className="text-muted-foreground">
              示例数据
            </Badge>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            nativeButton={false}
            render={<a href={PROJECT_LINKS.releases} target="_blank" rel="noreferrer" />}
          >
            全部
            <ExternalLink />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        {!isWorkbenchEnabled ? (
          <QueryState state="empty" className="h-32" title="未配置工作台数据源" />
        ) : query.isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <QueryState state="error" className="h-32" onRetry={() => void query.refetch()} />
        ) : !items || items.length === 0 ? (
          <QueryState state="empty" className="h-32" title="暂无发布记录" />
        ) : (
          <ul className="flex flex-col">
            {items.map(item => {
              const { version, rest } = releaseTitle(item.tagName, item.title)

              return (
                <li key={item.tagName} className="border-b last:border-b-0">
                  <a
                    href={safeHttpUrl(item.htmlUrl, PROJECT_LINKS.releases)}
                    target="_blank"
                    rel="noreferrer"
                    className="-mx-2 flex items-start gap-2 rounded-md px-2 py-2.5 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <Tag className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      <span className="font-medium">{version}</span>
                      {rest ? <span className="text-muted-foreground">{`｜${rest}`}</span> : null}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {releaseDate(item.publishedAt)}
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
