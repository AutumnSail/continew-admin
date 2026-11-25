import { BookOpen, ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useSiteOptions } from '@/hooks/use-site-options'
import { useAuthStore } from '@/stores/auth/auth-provider'

const PROJECT_LINKS = [
  { label: 'Admin 仓库', href: 'https://github.com/continew-org/continew-admin' },
  { label: '官方文档', href: 'https://continew.top/docs/admin/5.x' },
  { label: 'Starter 仓库', href: 'https://github.com/continew-org/continew-starter' }
] as const

/**
 * Welcome band at the top of the workbench: the signed-in name over the project links, with the
 * site logo as a low-contrast watermark.
 */
export function WorkbenchWelcome() {
  const user = useAuthStore(state => state.user)
  const { logo } = useSiteOptions()
  const displayName = user?.nickname || user?.username || '朋友'

  return (
    <Card className="relative isolate overflow-hidden bg-linear-to-br from-primary/5 to-card">
      <img
        src={logo}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -top-6 right-[6%] -z-10 size-32 object-contain opacity-10 select-none"
      />
      <CardContent className="flex flex-col gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">你好，{displayName}</h1>
          <p className="text-sm text-muted-foreground">欢迎回到工作台，这里汇总了 Open ContiNew 的近期动态。</p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {PROJECT_LINKS.map(link => (
            <Button
              key={link.href}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              nativeButton={false}
              render={<a href={link.href} target="_blank" rel="noreferrer" />}
            >
              {link.label}
              <ExternalLink className="opacity-60" />
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            nativeButton={false}
            render={<a href="https://continew.top" target="_blank" rel="noreferrer" />}
          >
            <BookOpen />
            官网
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
