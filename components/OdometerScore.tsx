'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  delay?: number
  className?: string
  style?: React.CSSProperties
}

export default function OdometerScore({ value, delay = 0, className = '', style }: Props) {
  const [go, setGo] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setGo(true)
      return
    }

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          const t = setTimeout(() => setGo(true), 60)
          observer.disconnect()
          return () => clearTimeout(t)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const digits = String(value).split('')

  return (
    <span
      ref={ref}
      className={className}
      style={{ display: 'inline-flex', lineHeight: 1, ...style }}
    >
      {digits.map((d, i) => {
        const n = parseInt(d, 10)
        return (
          <span
            key={i}
            style={{ display: 'inline-block', height: '1em', overflow: 'hidden' }}
          >
            <span
              style={{
                display: 'block',
                transform: `translateY(${go ? -n : 0}em)`,
                transition: `transform ${1 + i * 0.25}s cubic-bezier(.16,1,.3,1) ${delay}s`,
              }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => (
                <span key={k} style={{ display: 'block', height: '1em' }}>
                  {k}
                </span>
              ))}
            </span>
          </span>
        )
      })}
    </span>
  )
}
