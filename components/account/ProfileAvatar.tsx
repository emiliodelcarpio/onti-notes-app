'use client'

import Image from 'next/image'
import { useState } from 'react'

export default function ProfileAvatar({ name, avatarUrl, size = 'small' }: {
  name: string
  avatarUrl: string | null
  size?: 'small' | 'large'
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]).join('').toLocaleUpperCase('es') || 'U'

  return (
    <span aria-hidden="true" className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-highlight font-medium text-foreground ${size === 'large' ? 'size-24 text-2xl' : 'size-11 text-sm'}`}>
      {avatarUrl && failedUrl !== avatarUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          width={size === 'large' ? 96 : 44}
          height={size === 'large' ? 96 : 44}
          unoptimized
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(avatarUrl)}
          className="size-full object-cover"
        />
      ) : initials}
    </span>
  )
}
