import * as React from 'react'

import { useQuery } from '@tanstack/react-query'
import useEmblaCarousel, { CarouselDots } from '@animate-ui/react/primitives/carousel'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getRaw } from '@/lib/http'

const SPONSOR_BASE = 'https://continew.top'
const SPONSOR_FEED_PATH = '/sponsor.json'
const AUTOPLAY_MS = 4000

interface PromoItem {
  readonly name: string
  readonly img: string
  readonly url: string
}

interface SponsorEntry {
  name?: string
  img?: string
  url?: string
}

/** Only the two sponsor tiers the workbench shows. */
interface SponsorFeed {
  special?: SponsorEntry[]
  platinum?: SponsorEntry[]
}

/** Always available, shown before the feed resolves and kept when it fails. */
const STATIC_ITEMS: readonly PromoItem[] = [
  {
    name: '公众号',
    img: `${SPONSOR_BASE}/images/home/join-group.webp`,
    url: SPONSOR_BASE
  }
]

/** Sponsor images are either absolute URLs or file names inside the partners folder. */
function toImageUrl(img: string) {
  return /^https?:\/\//i.test(img) ? img : `${SPONSOR_BASE}/images/sponsor/partners/${img}`
}

function sponsorsToItems(feed: SponsorFeed | null): PromoItem[] {
  if (!feed) {
    return []
  }

  return [...(feed.special ?? []), ...(feed.platinum ?? [])]
    .filter(entry => Boolean(entry.name && entry.img))
    .map(entry => ({
      name: entry.name as string,
      img: toImageUrl(entry.img as string),
      url: entry.url ?? SPONSOR_BASE
    }))
}

/**
 * Sponsor carousel at the bottom of the workbench side column: continew.top's special and
 * platinum sponsors, followed by the always-available promo image. Auto-cycles, with dots and
 * arrows for manual control.
 */
export function WorkbenchSponsors() {
  const feed = useQuery({
    queryKey: ['workbench', 'sponsors'],
    queryFn: ({ signal }) => getRaw<SponsorFeed>(SPONSOR_FEED_PATH, { baseUrl: SPONSOR_BASE, signal }),
    // A marketing feed changes rarely and never within one visit.
    staleTime: 30 * 60_000,
    retry: 0
  })

  const items = React.useMemo(() => [...sponsorsToItems(feed.data ?? null), ...STATIC_ITEMS], [feed.data])

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' })

  // The slide count changes once the sponsor feed resolves, so re-init the loop.
  React.useEffect(() => {
    emblaApi?.reInit()
  }, [emblaApi, items.length])

  React.useEffect(() => {
    if (!emblaApi || items.length <= 1) {
      return
    }

    const timer = window.setInterval(() => emblaApi.scrollNext(), AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [emblaApi, items.length])

  return (
    <Card>
      <CardHeader>
        <CardTitle>赞助与支持</CardTitle>
        <CardDescription>感谢为项目提供资源与支持的伙伴</CardDescription>
      </CardHeader>
      <CardContent>
        <div data-slot="carousel" className="group/carousel relative">
          <div ref={emblaRef} className="overflow-hidden rounded-lg border">
            <div className="flex">
              {items.map(item => (
                <a
                  key={`${item.name}-${item.img}`}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 flex-[0_0_100%] items-center justify-center bg-background"
                >
                  <img src={item.img} alt={item.name} loading="lazy" className="aspect-16/9 w-full object-contain" />
                </a>
              ))}
            </div>
          </div>

          {items.length > 1 && (
            <>
              <button
                type="button"
                aria-label="上一张"
                onClick={() => emblaApi?.scrollPrev()}
                className="absolute top-1/2 left-1.5 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white opacity-0 transition-opacity group-hover/carousel:opacity-100 hover:bg-black/50 focus-visible:opacity-100"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label="下一张"
                onClick={() => emblaApi?.scrollNext()}
                className="absolute top-1/2 right-1.5 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white opacity-0 transition-opacity group-hover/carousel:opacity-100 hover:bg-black/50 focus-visible:opacity-100"
              >
                <ChevronRight className="size-4" />
              </button>
              <CarouselDots className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 text-white" />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
