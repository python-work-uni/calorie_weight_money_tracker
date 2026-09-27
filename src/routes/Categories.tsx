import { useState } from 'react'
import type { FormEvent } from 'react'
import Page from '../components/ui/Page'
import { useCategories } from '../hooks/useCategories'
import type { CategoryKind } from '../hooks/useCategories'

const FIELD = 'w-full rounded border border-slate-300 px-3 py-2 text-base'

const SWATCHES = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#64748b',
]

function CategoryManager({
  kind,
  title,
  description,
}: {
  kind: CategoryKind
  title: string
  description: string
}) {
  const { categories, loading, error, create, rename, remove } = useCategories(kind)

  const [name, setName] = useState('')
  const [color, setColor] = useState(SWATCHES[9])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(SWATCHES[9])
  const [localError, setLocalError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    if (name.trim() === '') {
      setLocalError('Give the category a name.')
      return
    }

    setBusy(true)
    setLocalError(null)
    const result = await create(name, color)
    setBusy(false)

    if (result.error) setLocalError(result.error)
    else setName('')
  }

  function startEdit(id: string, currentName: string, currentColor: string | null) {
    setEditingId(id)
    setEditName(currentName)
    setEditColor(currentColor ?? SWATCHES[9])
  }

  async function onSaveEdit() {
    if (!editingId) return
    setBusy(true)
    setLocalError(null)
    const result = await rename(editingId, editName, editColor)
    setBusy(false)

    if (result.error) setLocalError(result.error)
    else setEditingId(null)
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <header className="border-b border-slate-200 px-5 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-slate-500">{description}</p>
      </header>

      <ul className="divide-y divide-slate-100">
        {loading ? (
          <li className="px-5 py-3 text-sm text-slate-500">Loading…</li>
        ) : categories.length === 0 ? (
          <li className="px-5 py-3 text-sm text-slate-500">No categories yet.</li>
        ) : (
          categories.map((category) => (
            <li key={category.id} className="flex items-center gap-3 px-5 py-3">
              {editingId === category.id ? (
                <>
                  <input
                    type="color"
                    value={editColor}
                    onChange={(event) => setEditColor(event.target.value)}
                    className="h-9 w-12 shrink-0 rounded border border-slate-300"
                    aria-label="Colour"
                  />
                  <input
                    className={FIELD}
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => void onSaveEdit()}
                    disabled={busy}
                    className="shrink-0 rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="shrink-0 rounded border border-slate-300 px-3 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color ?? '#94a3b8' }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate text-sm">{category.name}</span>
                  {category.is_preset ? (
                    <span className="shrink-0 text-xs text-slate-400">preset</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => startEdit(category.id, category.name, category.color)}
                    className="shrink-0 rounded border border-slate-200 px-2 py-1 text-xs"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void remove(category.id).then((result) => {
                        if (result.error) setLocalError(result.error)
                      })
                    }}
                    className="shrink-0 rounded border border-slate-200 px-2 py-1 text-xs"
                  >
                    Delete
                  </button>
                </>
              )}
            </li>
          ))
        )}
      </ul>

      <form onSubmit={onCreate} className="flex gap-2 border-t border-slate-200 px-5 py-4">
        <input
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          className="h-11 w-12 shrink-0 rounded border border-slate-300"
          aria-label="Colour for the new category"
        />
        <input
          className={FIELD}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New category name"
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 rounded bg-slate-900 px-4 py-2.5 text-white disabled:opacity-60"
        >
          Add
        </button>
      </form>

      {localError || error ? (
        <p role="alert" className="px-5 pb-4 text-sm text-red-700">
          {localError ?? error}
        </p>
      ) : null}
    </section>
  )
}

export default function Categories() {
  return (
    <Page
      title="Categories"
      subtitle="Presets ship with the app; add your own or rename anything."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <CategoryManager
          kind="food"
          title="Food categories"
          description="Used for calorie entries and the category breakdown chart."
        />
        <CategoryManager
          kind="spending"
          title="Spending categories"
          description="Used for expenses and the spending breakdown chart."
        />
      </div>
    </Page>
  )
}
