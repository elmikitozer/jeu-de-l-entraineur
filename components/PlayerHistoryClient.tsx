'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { PlayerMatchEntry } from '@/lib/queries'
import type { PointsBreakdown } from '@/lib/types'
import { TEAM_NAME_FR } from '@/lib/flags'

interface Props {
  history: PlayerMatchEntry[]
}

const BREAKDOWN_LABELS: Record<keyof PointsBreakdown, string> = {
  win_bonus: 'Victoire',
  draw_bonus: 'Match nul',
  goal_position_bonus: 'But (bonus position)',
  goal_freekick_bonus: 'But coup franc',
  goal_penalty_bonus: 'But penalty',
  assist_bonus: 'Passe décisive',
  motm_bonus: 'Homme du match',
  cleansheet_bonus: 'Clean sheet',
  penalty_saved_bonus: 'Penalty arrêté',
  red_card_malus: 'Carton rouge',
}

const RESULT_LABELS: Record<string, { label: string; color: string }> = {
  win: { label: 'V', color: 'text-delta-pos' },
  draw: { label: 'N', color: 'text-sub' },
  loss: { label: 'D', color: 'text-delta-neg' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function PlayerHistoryClient({ history }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const chartData = history.map((e, i) => ({
    match: i + 1,
    points: e.cumulative_points,
    label: `${TEAM_NAME_FR[e.home_team] ?? e.home_team} - ${TEAM_NAME_FR[e.away_team] ?? e.away_team}`,
  }))

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  if (history.length === 0) {
    return (
      <p className="text-center py-16 text-sub font-body">
        Aucun match joué pour l&apos;instant.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Chart */}
      <div className="bg-card border border-line rounded-2xl p-6">
        <h2 className="font-display font-bold text-[22px] uppercase tracking-[0.04em] text-ink mb-5">
          Évolution des points
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--c-line)" />
            <XAxis
              dataKey="match"
              tick={{ fontFamily: 'var(--font-body)', fontSize: 12, fill: 'var(--c-sub)' }}
              axisLine={{ stroke: 'var(--c-line)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontFamily: 'var(--font-body)', fontSize: 12, fill: 'var(--c-sub)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--c-card)',
                border: '1px solid var(--c-line)',
                borderRadius: 8,
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'var(--c-ink)',
              }}
              formatter={(value) => [`${value} pts`, 'Cumulé']}
            />
            <Line
              type="monotone"
              dataKey="points"
              stroke="var(--c-green)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: 'var(--c-green)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Historique */}
      <div className="bg-card border border-line rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[100px_1fr_60px_80px_36px] px-5 py-3.5 border-b-2 border-ink text-[11px] font-bold font-body tracking-[0.1em] text-sub uppercase">
          <span>Date</span>
          <span>Match</span>
          <span className="text-center">Résultat</span>
          <span className="text-right">Points</span>
          <span />
        </div>

        {history.map((entry, idx) => {
          const isOpen = expanded.has(entry.match_id)
          const res = entry.result ? RESULT_LABELS[entry.result] : null

          const breakdown = entry.breakdown as Partial<PointsBreakdown>
          const breakdownEntries = Object.entries(breakdown ?? {}).filter(([, v]) => (v as number) !== 0)

          return (
            <div
              key={entry.match_id}
              style={{
                background: idx % 2 === 0 ? 'var(--c-zebra)' : 'var(--c-card)',
                borderBottom: idx < history.length - 1 ? '1px solid var(--c-line)' : 'none',
              }}
            >
              <button
                onClick={() => toggle(entry.match_id)}
                className="w-full grid grid-cols-[100px_1fr_60px_80px_36px] items-center px-5 py-3 text-left hover:opacity-80 transition-opacity"
              >
                <span className="text-[12px] font-body text-sub">
                  {formatDate(entry.match_date)}
                </span>
                <span className="text-[14px] font-semibold font-body text-ink truncate">
                  {TEAM_NAME_FR[entry.home_team] ?? entry.home_team} — {TEAM_NAME_FR[entry.away_team] ?? entry.away_team}
                  {entry.home_score !== null && (
                    <span className="ml-2 text-sub font-normal">
                      ({entry.home_score}–{entry.away_score})
                    </span>
                  )}
                </span>
                <span className={`text-center text-[14px] font-bold font-body ${res?.color ?? 'text-sub'}`}>
                  {entry.played ? (res?.label ?? '—') : '—'}
                </span>
                <span className={`text-right font-display font-bold italic text-[22px] ${entry.total_points > 0 ? 'text-delta-pos' : entry.total_points < 0 ? 'text-delta-neg' : 'text-sub'}`}>
                  {entry.total_points > 0 ? '+' : ''}{entry.total_points}
                </span>
                <span className="text-center text-sub text-[12px]">
                  {isOpen ? '▲' : '▼'}
                </span>
              </button>

              {isOpen && breakdownEntries.length > 0 && (
                <div className="px-5 pb-3 pt-0">
                  <div className="bg-bg rounded-xl p-3 flex flex-col gap-1.5">
                    {breakdownEntries.map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center text-[13px]">
                        <span className="font-body text-sub">
                          {BREAKDOWN_LABELS[key as keyof PointsBreakdown] ?? key}
                        </span>
                        <span className={`font-display font-bold italic text-[16px] ${(value as number) > 0 ? 'text-delta-pos' : 'text-delta-neg'}`}>
                          {(value as number) > 0 ? '+' : ''}{value as number}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-[13px] pt-1.5 border-t border-line mt-0.5">
                      <span className="font-body font-semibold text-ink">Total</span>
                      <span className="font-display font-bold italic text-[18px] text-ink">
                        {entry.total_points > 0 ? '+' : ''}{entry.total_points}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
