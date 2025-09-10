// src/app/Router.tsx
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'

export function Router() {
  // simple light/dark toggle for now
  const [dark, setDark] = useState(false)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="font-semibold">Payouts Dashboard</div>
          <Button
            className="btn btn-primary"
            onClick={() => setDark((d) => !d)}
          >
            Toggle {dark ? 'Light' : 'Dark'}
          </Button>
        </div>
      </header>

      <main className="container py-8">
        <section className="grid gap-6 md:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-2">Quick Actions</h2>
            <p className="text-muted-foreground">
              Use the style tokens to keep a consistent look & feel.
            </p>
            <div className="mt-4 flex gap-3">
              <button className="btn btn-primary">New Payout</button>
              <button className="btn bg-secondary text-secondary-foreground hover:brightness-110">
                View History
              </button>
            </div>
          </div>
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-2">Status</h2>
            <p className="text-muted-foreground">
              Theme colors: <span className="text-primary">primary</span>,{' '}
              <span className="text-success">success</span>,{' '}
              <span className="text-warning">warning</span>,{' '}
              <span className="text-destructive">destructive</span>.
            </p>
          </div>

            <div className="border bg-card text-card-foreground p-4 rounded-xl">
                <p className="text-muted-foreground">Token check ✓</p>
                <Button className="btn btn-primary mt-3">Primary</Button>
            </div>

        </section>
      </main>
    </div>
  )
}
