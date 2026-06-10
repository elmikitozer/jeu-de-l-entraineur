'use client'

import { useReducer, useState, useEffect, useCallback } from 'react'
import type { Player, Position } from '@/lib/types'
import { PlayerSearch } from '@/components/admin/PlayerSearch'
import { FormationPreview } from '@/components/admin/FormationPreview'
import { ParticipantList, type ParticipantEntry } from '@/components/admin/ParticipantList'

// ── Types ───────────────────────────────────────────────────────────────────

interface TeamState {
  participantName: string
  editingId: string | null
  selections: Record<number, Player | null>
}

type TeamAction =
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_PLAYER'; slot: number; player: Player | null }
  | { type: 'LOAD'; name: string; id: string | null; slots: Record<number, Player | null> }
  | { type: 'RESET' }

const EMPTY_SLOTS: Record<number, Player | null> = Object.fromEntries(
  Array.from({ length: 11 }, (_, i) => [i + 1, null])
)

const INITIAL_STATE: TeamState = {
  participantName: '',
  editingId: null,
  selections: { ...EMPTY_SLOTS },
}

function reducer(state: TeamState, action: TeamAction): TeamState {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, participantName: action.name }
    case 'SET_PLAYER':
      return { ...state, selections: { ...state.selections, [action.slot]: action.player } }
    case 'LOAD':
      return { participantName: action.name, editingId: action.id, selections: action.slots }
    case 'RESET':
      return { ...INITIAL_STATE, selections: { ...EMPTY_SLOTS } }
  }
}

// ── Formation config ────────────────────────────────────────────────────────

interface Section {
  title: string
  position: Position
  slots: number[]
}

const SECTIONS: Section[] = [
  { title: 'Gardien',     position: 'GK',  slots: [1] },
  { title: 'Défenseurs',  position: 'DEF', slots: [2, 3, 4, 5] },
  { title: 'Milieux',     position: 'MID', slots: [6, 7, 8] },
  { title: 'Attaquants',  position: 'FWD', slots: [9, 10, 11] },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

function getSelectedIds(selections: Record<number, Player | null>): Set<string> {
  const ids = new Set<string>()
  for (const p of Object.values(selections)) {
    if (p) ids.add(p.id)
  }
  return ids
}

interface NatWarning {
  nationality: string
  count: number
  isError: boolean
}

function getNatWarnings(selections: Record<number, Player | null>): NatWarning[] {
  const count: Record<string, number> = {}
  for (const p of Object.values(selections)) {
    if (p) count[p.nationality] = (count[p.nationality] ?? 0) + 1
  }
  return Object.entries(count)
    .filter(([, n]) => n >= 3)
    .map(([nationality, n]) => ({ nationality, count: n, isError: n > 3 }))
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [participants, setParticipants] = useState<ParticipantEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [retroactive, setRetroactive] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<ParticipantEntry | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  const loadData = useCallback(async () => {
    try {
      const [playersRes, teamsRes] = await Promise.all([
        fetch('/api/admin/players'),
        fetch('/api/admin/teams'),
      ])
      const [{ players: allPlayers }, { participants: allParticipants }] = await Promise.all([
        playersRes.json() as Promise<{ players: Player[] }>,
        teamsRes.json() as Promise<{ participants: ParticipantEntry[] }>,
      ])
      setPlayers(allPlayers ?? [])
      setParticipants(allParticipants ?? [])
    } catch {
      // ignore — données vides affichées
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Charger l'équipe d'un participant dans le formulaire
  function handleSelectParticipant(p: ParticipantEntry) {
    const slots: Record<number, Player | null> = { ...EMPTY_SLOTS }
    for (const { slot, player } of p.team) {
      slots[slot] = player
    }
    dispatch({ type: 'LOAD', name: p.name, id: p.id, slots })
    setRetroactive(false)
    setSubmitMsg(null)
  }

  async function handleDeleteConfirmed() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/teams?participantId=${confirmDelete.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setSubmitMsg({ type: 'error', text: data.error ?? 'Erreur suppression' })
      } else {
        if (state.editingId === confirmDelete.id) {
          dispatch({ type: 'RESET' })
          setRetroactive(false)
        }
        await loadData()
      }
    } catch {
      setSubmitMsg({ type: 'error', text: 'Erreur réseau' })
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setSubmitMsg(null)

    try {
      const slots = Object.entries(state.selections).map(([slotStr, player]) => ({
        slot: parseInt(slotStr, 10),
        player_id: (player as Player).id,
      }))

      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_name: state.participantName, slots, retroactive }),
      })

      const data = (await res.json()) as { error?: string; retro_points?: number }

      if (!res.ok) {
        setSubmitMsg({ type: 'error', text: data.error ?? 'Erreur inconnue' })
      } else {
        const retroMsg =
          retroactive && data.retro_points !== undefined
            ? ` — ${data.retro_points} points rétroactifs calculés`
            : ''
        setSubmitMsg({
          type: 'success',
          text: `Équipe de ${state.participantName} enregistrée !${retroMsg}`,
        })
        dispatch({ type: 'RESET' })
        setRetroactive(false)
        await loadData()
      }
    } catch {
      setSubmitMsg({ type: 'error', text: 'Erreur réseau' })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Dérivés ───────────────────────────────────────────────────────────────

  const selectedIds = getSelectedIds(state.selections)
  const natWarnings = getNatWarnings(state.selections)
  const filledSlots = Object.values(state.selections).filter(Boolean).length
  const hasNatError = natWarnings.some((w) => w.isError)
  const canSubmit =
    !hasNatError &&
    filledSlots === 11 &&
    state.participantName.trim().length > 0 &&
    !submitting

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="text-gray-500">Chargement…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      {/* En-tête */}
      <header className="border-b border-[#2a2a2a] px-6 py-4 flex items-center justify-between shrink-0">
        <h1 className="text-[#C9A84C] font-bold text-base">⚽ Admin — Jeu de l&apos;Entraîneur</h1>
        <form action="/api/admin/logout" method="POST">
          <button
            type="submit"
            className="text-gray-500 text-sm hover:text-white transition-colors"
          >
            Déconnexion
          </button>
        </form>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar gauche — liste des participants */}
        <aside className="w-60 border-r border-[#2a2a2a] flex flex-col shrink-0">
          <div className="p-4 border-b border-[#2a2a2a]">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Participants ({participants.length})
            </h2>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'RESET' })
                setSubmitMsg(null)
              }}
              className="w-full text-left px-3 py-2 rounded border border-dashed border-[#C9A84C]/40 text-[#C9A84C] text-sm hover:bg-[#C9A84C]/10 transition-colors"
            >
              + Nouveau participant
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <ParticipantList
              participants={participants}
              onSelect={handleSelectParticipant}
              onDelete={(p) => setConfirmDelete(p)}
              selectedId={state.editingId}
            />
          </div>
        </aside>

        {/* Zone principale */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="max-w-4xl mx-auto grid grid-cols-5 gap-6">
              {/* Colonne gauche — saisie */}
              <div className="col-span-3 space-y-5">
                {/* Nom du participant */}
                <div>
                  <label htmlFor="participant-name" className="block text-sm text-gray-400 mb-1.5">
                    Nom du participant
                  </label>
                  <input
                    id="participant-name"
                    type="text"
                    value={state.participantName}
                    onChange={(e) => dispatch({ type: 'SET_NAME', name: e.target.value })}
                    placeholder="Ex : Pierre, Marie…"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-2 text-white text-sm outline-none focus:border-[#C9A84C] transition-colors"
                  />
                </div>

                {/* Calcul rétroactif — visible uniquement pour un nouveau participant */}
                {!state.editingId && (
                  <div className="flex items-center justify-between bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm text-gray-300 font-medium">Calculer les points depuis le début</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Recalcule les points sur tous les matchs déjà terminés
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={retroactive}
                      onClick={() => setRetroactive((v) => !v)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        retroactive ? 'bg-[#C9A84C]' : 'bg-[#333]'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          retroactive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}

                {/* Avertissements nationalité */}
                {natWarnings.length > 0 && (
                  <div className="space-y-1.5">
                    {natWarnings.map((w) => (
                      <div
                        key={w.nationality}
                        className={`text-xs px-3 py-2 rounded flex items-center gap-2 ${
                          w.isError
                            ? 'bg-red-950/40 border border-red-700/60 text-red-400'
                            : 'bg-yellow-950/30 border border-yellow-700/40 text-yellow-400'
                        }`}
                      >
                        <span>{w.isError ? '❌' : '⚠️'}</span>
                        {w.nationality} : {w.count}/3 joueurs
                        {w.isError ? ' — LIMITE DÉPASSÉE' : ' (limite atteinte)'}
                      </div>
                    ))}
                  </div>
                )}

                {/* Sections par position */}
                {SECTIONS.map((section) => (
                  <div
                    key={section.position}
                    className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-4"
                  >
                    <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-[#2a2a2a] rounded text-xs font-bold text-gray-400">
                        {section.position}
                      </span>
                      {section.title}
                    </h3>
                    <div className="space-y-2">
                      {section.slots.map((slot) => {
                        const currentPlayer = state.selections[slot]
                        const disabledForSlot = new Set(selectedIds)
                        if (currentPlayer) disabledForSlot.delete(currentPlayer.id)

                        return (
                          <PlayerSearch
                            key={slot}
                            slot={slot}
                            position={section.position}
                            players={players}
                            value={currentPlayer}
                            onChange={(player) =>
                              dispatch({ type: 'SET_PLAYER', slot, player })
                            }
                            disabledIds={disabledForSlot}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Bouton soumission */}
                <div className="pt-1">
                  {submitMsg && (
                    <div
                      className={`text-sm px-3 py-2 rounded mb-3 ${
                        submitMsg.type === 'success'
                          ? 'bg-green-950/40 border border-green-700/50 text-green-400'
                          : 'bg-red-950/40 border border-red-700/50 text-red-400'
                      }`}
                    >
                      {submitMsg.text}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-500">
                      {filledSlots}/11 joueurs sélectionnés
                    </span>
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="px-5 py-2 bg-[#C9A84C] text-black font-semibold rounded text-sm hover:bg-[#D4B85A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {submitting ? 'Enregistrement…' : 'Enregistrer l\'équipe'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Colonne droite — aperçu */}
              <div className="col-span-2 space-y-3">
                <h3 className="text-sm font-semibold text-gray-400">
                  Aperçu 4-3-3
                </h3>
                <FormationPreview selections={state.selections} />

                {/* Récapitulatif des nationalités */}
                {filledSlots > 0 && (
                  <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">
                      Nationalités
                    </p>
                    <div className="space-y-1">
                      {Object.entries(
                        Object.values(state.selections).reduce<Record<string, number>>(
                          (acc, p) => {
                            if (p) acc[p.nationality_code] = (acc[p.nationality_code] ?? 0) + 1
                            return acc
                          },
                          {}
                        )
                      )
                        .sort(([, a], [, b]) => b - a)
                        .map(([code, n]) => (
                          <div key={code} className="flex items-center justify-between text-xs">
                            <span className="text-gray-300">{code}</span>
                            <span
                              className={`font-mono ${n > 3 ? 'text-red-400' : n === 3 ? 'text-yellow-400' : 'text-gray-500'}`}
                            >
                              {n}/3
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Modale de confirmation de suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-80 shadow-xl">
            <p className="text-white text-sm font-medium mb-1">
              Supprimer l&apos;équipe de <span className="text-[#C9A84C]">{confirmDelete.name}</span>&nbsp;?
            </p>
            <p className="text-gray-500 text-xs mb-5">
              Les entrées teams et participants seront supprimées. L&apos;historique des points est conservé.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteConfirmed()}
                disabled={deleting}
                className="px-4 py-1.5 text-sm bg-red-700 hover:bg-red-600 text-white rounded transition-colors disabled:opacity-40"
              >
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
