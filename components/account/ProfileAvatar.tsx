'use client'

import Image from 'next/image'
import { useState } from 'react'

export default function ProfileAvatar({ name, avatarUrl }: {
  name: string
  avatarUrl: string | null
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]).join('').toLocaleUpperCase('es') || 'U'

  return (
    <span aria-hidden="true" className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-highlight text-sm font-medium text-foreground">
      {avatarUrl && failedUrl !== avatarUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          width={44}
          height={44}
          unoptimized
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(avatarUrl)}
          className="size-full object-cover"
        />
      ) : initials}
    </span>
  )
}
