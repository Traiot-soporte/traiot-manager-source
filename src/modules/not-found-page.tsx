import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="rounded-3xl bg-white p-10 text-center">
      <p className="text-sm font-black uppercase tracking-[0.2em] text-brand-600">404</p>
      <h1 className="mt-2 text-3xl font-black text-ink-950">Esta vista no existe</h1>
      <Link
        className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-ink-950 px-5 text-sm font-bold text-white"
        to="/"
      >
        Ir al resumen
      </Link>
    </section>
  )
}
