import type { ReactNode } from 'react'

type PageProps = {
  title: string
  subtitle?: string
  children?: ReactNode
}

export default function Page({ title, subtitle, children }: PageProps) {
  return (
    <section className="mx-auto max-w-3xl">
      <header className="mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  )
}
