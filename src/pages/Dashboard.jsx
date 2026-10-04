import { useState } from 'react'
import {
  Check,
  Clapperboard,
  Eye,
  MessageSquare,
  Instagram,
  MapPin,
  MonitorSmartphone,
  Pencil,
  PlayCircle,
  Plus,
  RadioTower,
  RotateCcw,
  Send,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Youtube,
  Trash2,
  Trophy,
  Tv,
  UsersRound,
  X,
} from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { useData } from '@/context/DataContext.jsx'
import { MonthTabs, MONTHS_FULL } from '@/components/campaigns/MonthTabs.jsx'
import { SegmentTabs } from '@/components/ui/Tabs.jsx'
import { useToast } from '@/components/ui/Toast.jsx'
import { useConfirm } from '@/components/ui/Confirm.jsx'
import { formatCompact, formatPct, formatNumber } from '@/lib/format.js'
import { cloneOverview } from '@/lib/overviewSeed.js'
import { PageHeader } from '@/components/PageHeader.jsx'
import { Card } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button'
import { SharePie } from '@/components/charts/SharePie.jsx'
import { colorAt } from '@/components/charts/palette.js'
import { uid } from '@/lib/id.js'
import { cn } from '@/lib/cn.js'

// Иконки в базе лежат ключами — здесь возвращаем их компоненты.
const ICONS = {
  RadioTower,
  Clapperboard,
  Tv,
  Timer,
  PlayCircle,
  Instagram,
  Send,
}

const inputClass =
  'w-full rounded-lg border border-indigo-300 bg-surface px-2 py-1 text-sm text-ink outline-hidden transition-colors focus:border-indigo-500 focus-ring'

/** Текстовое поле правки: вне режима редактирования — обычный текст. */
function EditText({ editing, value, onChange, className, children }) {
  if (!editing) return children ?? value
  return (
    <input
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={cn(inputClass, className)}
    />
  )
}

/** Числовое поле правки — дробные проценты тоже вводятся здесь. */
function EditNumber({ editing, value, onChange, className, children }) {
  if (!editing) return children
  return (
    <input
      type="number"
      step="any"
      value={value ?? 0}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(inputClass, 'tnum text-right', className)}
    />
  )
}

/** Кружок цвета: в режиме правки — нативный пикер. */
function EditColor({ editing, value, onChange, className }) {
  if (!editing) {
    return (
      <span
        className={cn('shrink-0 rounded-full', className)}
        style={{ backgroundColor: value }}
      />
    )
  }
  return (
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Цвет"
      className={cn(
        'h-5 w-5 shrink-0 cursor-pointer rounded-full border border-line bg-transparent p-0',
        className,
      )}
    />
  )
}

/** Корзина у строки списка — только в режиме правки. */
function RemoveButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger focus-ring"
    >
      <Trash2 size={14} />
    </button>
  )
}

function AddButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-indigo-300 px-3 py-1.5 text-[12px] font-medium text-indigo-800 transition-colors hover:border-indigo-500 hover:bg-indigo-50 focus-ring"
    >
      <Plus size={14} />
      {children}
    </button>
  )
}

function SocialChannelCard({ channel, editing, onChange, onRemove }) {
  const Icon = ICONS[channel.icon] ?? Instagram
  const max = Math.max(1, ...channel.rows.map((row) => row.value))
  const patch = (part) => onChange({ ...channel, ...part })

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-line p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink"
            style={{ backgroundColor: channel.color }}
          >
            <Icon size={19} />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold text-ink">
              <EditText
                editing={editing}
                value={channel.name}
                onChange={(name) => patch({ name })}
              />
            </h3>
            <p className="flex items-center gap-2 text-[12px] text-ink-muted">
              Результаты публикаций
              <EditColor
                editing={editing}
                value={channel.color}
                onChange={(color) => patch({ color })}
                className="h-3 w-3"
              />
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-xl font-semibold text-ink tnum">
            <EditNumber
              editing={editing}
              value={channel.impressions}
              onChange={(impressions) => patch({ impressions })}
            >
              {formatCompact(channel.impressions)}
            </EditNumber>
          </div>
          <p className="text-[11px] text-ink-muted">показов</p>
        </div>
        {editing && onRemove && (
          <RemoveButton onClick={onRemove} label={`Удалить ${channel.name}`} />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 bg-paper/45 p-4">
        <div className="rounded-xl bg-surface px-3 py-2.5">
          <p className="text-[11px] text-ink-muted">Публикации</p>
          <div className="mt-1 font-display text-xl font-semibold text-ink tnum">
            <EditNumber
              editing={editing}
              value={channel.posts}
              onChange={(posts) => patch({ posts })}
            >
              {channel.posts}
            </EditNumber>
          </div>
        </div>
        <div className="rounded-xl bg-surface px-3 py-2.5">
          <p className="text-[11px] text-ink-muted">Средний охват</p>
          <p className="mt-1 font-display text-xl font-semibold text-ink tnum">
            {channel.posts
              ? formatCompact(channel.impressions / channel.posts)
              : '—'}
          </p>
        </div>
      </div>
      <div className="space-y-3 p-5 pt-4">
        {channel.rows.map((row, index) => (
          <div
            key={row.id}
            className={cn(
              'grid items-center gap-3',
              editing
                ? 'grid-cols-[92px_1fr_110px_28px]'
                : 'grid-cols-[92px_1fr_62px]',
            )}
          >
            <span className="text-[12px] text-ink-muted">
              Публикация {String(index + 1).padStart(2, '0')}
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-ink/6">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${(row.value / max) * 100}%`,
                  backgroundColor: channel.color,
                }}
              />
            </span>
            <span className="text-right text-[12px] font-medium text-ink tnum">
              <EditNumber
                editing={editing}
                value={row.value}
                onChange={(value) =>
                  patch({
                    rows: channel.rows.map((r) =>
                      r.id === row.id ? { ...r, value } : r,
                    ),
                  })
                }
              >
                {formatNumber(row.value)}
              </EditNumber>
            </span>
            {editing && (
              <RemoveButton
                onClick={() =>
                  patch({ rows: channel.rows.filter((r) => r.id !== row.id) })
                }
                label={`Удалить публикацию ${index + 1}`}
              />
            )}
          </div>
        ))}
        {editing && (
          <AddButton
            onClick={() =>
              patch({ rows: [...channel.rows, { id: uid('row'), value: 0 }] })
            }
          >
            Добавить публикацию
          </AddButton>
        )}
      </div>
    </Card>
  )
}

function MediaSummary({ data, editing, patch }) {
  const { summary, socialChannels } = data

  return (
    <>
      <section className="relative overflow-hidden rounded-[28px] border border-indigo-200 bg-linear-to-br from-surface via-[#fffdf5] to-indigo-100 p-5 shadow-lift sm:p-7">
        <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full border border-indigo-300/60" />
        <div className="pointer-events-none absolute -right-8 -top-12 h-44 w-44 rounded-full bg-indigo-200/45 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-800">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              Setanta Media Report
            </div>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
              <EditText
                editing={editing}
                value={summary.title}
                onChange={(title) => patch({ summary: { ...summary, title } })}
              />
            </h2>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {socialChannels.map((channel) => (
          <SocialChannelCard
            key={channel.id}
            channel={channel}
            editing={editing}
            onChange={(next) =>
              patch({
                socialChannels: socialChannels.map((c) =>
                  c.id === next.id ? next : c,
                ),
              })
            }
            onRemove={() =>
              patch({
                socialChannels: socialChannels.filter(
                  (c) => c.id !== channel.id,
                ),
              })
            }
          />
        ))}
      </div>
      {editing && (
        <AddButton
          onClick={() =>
            patch({
              socialChannels: [
                ...socialChannels,
                {
                  id: uid('sc'),
                  name: 'Новая площадка',
                  icon: 'Send',
                  color: '#FFD106',
                  posts: 1,
                  impressions: 0,
                  rows: [{ id: uid('row'), value: 0 }],
                },
              ],
            })
          }
        >
          Добавить соцсеть
        </AddButton>
      )}
    </>
  )
}

/** Список долей рядом с бубликом: подпись, цвет и процент. */
function ShareList({ items, editing, onChange, itemClassName, addLabel }) {
  return (
    <>
      {items.map((item) => (
        <div
          key={item.id}
          className={cn('flex items-center gap-2 text-sm', itemClassName)}
        >
          <EditColor
            editing={editing}
            value={item.color}
            onChange={(color) =>
              onChange(
                items.map((i) => (i.id === item.id ? { ...i, color } : i)),
              )
            }
            className="h-2.5 w-2.5"
          />
          <span className="min-w-0 flex-1 text-ink-soft">
            <EditText
              editing={editing}
              value={item.label}
              onChange={(label) =>
                onChange(
                  items.map((i) => (i.id === item.id ? { ...i, label } : i)),
                )
              }
            />
          </span>
          <span className="w-[76px] text-right font-semibold text-ink tnum">
            <EditNumber
              editing={editing}
              value={item.value}
              onChange={(value) =>
                onChange(
                  items.map((i) => (i.id === item.id ? { ...i, value } : i)),
                )
              }
            >
              {formatPct(item.value, 0)}
            </EditNumber>
          </span>
          {editing && (
            <RemoveButton
              onClick={() => onChange(items.filter((i) => i.id !== item.id))}
              label={`Удалить ${item.label}`}
            />
          )}
        </div>
      ))}
      {editing && (
        <AddButton
          onClick={() =>
            onChange([
              ...items,
              {
                id: uid('share'),
                label: 'Новая группа',
                value: 0,
                color: '#A7ADB4',
              },
            ])
          }
        >
          {addLabel}
        </AddButton>
      )}
    </>
  )
}

function AudienceAgeReport({ data, editing, patch }) {
  const { audience, ageShare, platformDeviceShare, leagueAgeRows } = data
  const malePct = formatPct(audience.malePct, 1)

  return (
    <section className="mt-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
            Audience insights
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-ink">
            Возраст целевой аудитории
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Демография зрителей Setanta Sports и распределение по лигам.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-line bg-paper/70 px-3 py-2 text-[12px] font-semibold text-ink-soft">
          <UsersRound size={16} />
          <EditNumber
            editing={editing}
            value={audience.malePct}
            onChange={(value) =>
              patch({ audience: { ...audience, malePct: value } })
            }
            className="w-20"
          >
            {malePct}
          </EditNumber>
          аудитории — мужчины
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-paper/45 p-5">
            <h3 className="font-display text-lg font-semibold text-ink">
              <EditText
                editing={editing}
                value={audience.ageTitle}
                onChange={(ageTitle) =>
                  patch({ audience: { ...audience, ageTitle } })
                }
              />
            </h3>
            <div className="mt-1 text-[13px] text-ink-muted">
              <EditText
                editing={editing}
                value={audience.ageNote}
                onChange={(ageNote) =>
                  patch({ audience: { ...audience, ageNote } })
                }
              />
            </div>
          </div>
          <div className="flex flex-col items-center gap-6 p-5 sm:flex-row sm:justify-center sm:p-6">
            <SharePie
              data={ageShare}
              size={220}
              thickness={34}
              centerValue={malePct}
              centerLabel="мужчины"
            />
            <div className="w-full max-w-[280px] space-y-2.5">
              <ShareList
                items={ageShare}
                editing={editing}
                onChange={(next) => patch({ ageShare: next })}
                itemClassName="rounded-xl border border-line bg-paper/55 px-3 py-2.5"
                addLabel="Добавить возрастную группу"
              />
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-start justify-between gap-4 border-b border-line bg-paper/45 p-5">
            <div>
              <h3 className="font-display text-lg font-semibold text-ink">
                Устройства: OTT и TV
              </h3>
              <p className="mt-1 text-[13px] text-ink-muted">
                Доля просмотров по типам экранов в каждой среде.
              </p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-white shadow-soft">
              <MonitorSmartphone size={19} />
            </span>
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            {platformDeviceShare.map((platform) => (
              <div
                key={platform.id}
                className="flex flex-col items-center gap-4 rounded-2xl border border-line/80 bg-paper/55 p-4"
              >
                <SharePie
                  data={platform.data}
                  size={176}
                  thickness={30}
                  centerValue={platform.platform}
                />
                {editing && (
                  <EditText
                    editing={editing}
                    value={platform.platform}
                    onChange={(name) =>
                      patch({
                        platformDeviceShare: platformDeviceShare.map((p) =>
                          p.id === platform.id ? { ...p, platform: name } : p,
                        ),
                      })
                    }
                  />
                )}
                <div className="w-full space-y-2">
                  <ShareList
                    items={platform.data}
                    editing={editing}
                    onChange={(next) =>
                      patch({
                        platformDeviceShare: platformDeviceShare.map((p) =>
                          p.id === platform.id ? { ...p, data: next } : p,
                        ),
                      })
                    }
                    itemClassName="text-[13px]"
                    addLabel="Добавить экран"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line bg-paper/45 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">
              Возраст аудитории по лигам
            </h3>
            <p className="mt-1 text-[13px] text-ink-muted">
              Доля зрителей в каждой возрастной группе.
            </p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-white shadow-soft">
            <Trophy size={19} />
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-ink text-white">
              <tr className="text-[11px] font-semibold uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Sport</th>
                <th className="px-5 py-3 text-left">League</th>
                <th className="px-4 py-3 text-center">18–24 y.o.</th>
                <th className="px-4 py-3 text-center">25–34 y.o.</th>
                <th className="px-4 py-3 text-center">35–44 y.o.</th>
                <th className="px-4 py-3 text-center">45–54 y.o.</th>
                {editing && <th className="px-3 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {leagueAgeRows.map((row) => (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-indigo-50/70"
                >
                  <td className="px-5 py-3.5 font-semibold text-ink">
                    <EditText
                      editing={editing}
                      value={row.sport}
                      onChange={(sport) =>
                        patch({
                          leagueAgeRows: leagueAgeRows.map((r) =>
                            r.id === row.id ? { ...r, sport } : r,
                          ),
                        })
                      }
                    />
                  </td>
                  <td className="max-w-[270px] px-5 py-3.5 text-[13px] text-ink-soft">
                    <EditText
                      editing={editing}
                      value={row.leagues}
                      onChange={(leagues) =>
                        patch({
                          leagueAgeRows: leagueAgeRows.map((r) =>
                            r.id === row.id ? { ...r, leagues } : r,
                          ),
                        })
                      }
                    />
                  </td>
                  {row.ages.map((value, index) => (
                    <td
                      key={`${row.id}-${index}`}
                      className="px-4 py-3.5 text-center font-semibold text-ink tnum"
                    >
                      <EditNumber
                        editing={editing}
                        value={value}
                        onChange={(next) =>
                          patch({
                            leagueAgeRows: leagueAgeRows.map((r) =>
                              r.id === row.id
                                ? {
                                    ...r,
                                    ages: r.ages.map((a, i) =>
                                      i === index ? next : a,
                                    ),
                                  }
                                : r,
                            ),
                          })
                        }
                      >
                        <span className="inline-flex min-w-[58px] justify-center rounded-lg border border-line bg-paper/70 px-2 py-1.5">
                          {formatPct(value, 1)}
                        </span>
                      </EditNumber>
                    </td>
                  ))}
                  {editing && (
                    <td className="px-3 py-3.5">
                      <RemoveButton
                        onClick={() =>
                          patch({
                            leagueAgeRows: leagueAgeRows.filter(
                              (r) => r.id !== row.id,
                            ),
                          })
                        }
                        label={`Удалить ${row.sport}`}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editing && (
          <div className="px-5 pb-4">
            <AddButton
              onClick={() =>
                patch({
                  leagueAgeRows: [
                    ...leagueAgeRows,
                    {
                      id: uid('lg'),
                      sport: 'Новый вид спорта',
                      leagues: '',
                      ages: [0, 0, 0, 0],
                    },
                  ],
                })
              }
            >
              Добавить строку
            </AddButton>
          </div>
        )}
      </Card>
    </section>
  )
}

function AudienceBreakdown({ data, editing, patch }) {
  const { deviceShare, cityShare } = data
  // В центре бублика — самый крупный тип экрана.
  const topDevice = [...deviceShare].sort((a, b) => b.value - a.value)[0]

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-semibold text-ink">
              Распределение устройств
            </h3>
            <p className="text-[13px] text-ink-muted">
              Доля просмотров по типам экранов
            </p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-900">
            <MonitorSmartphone size={18} />
          </span>
        </div>
        <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
          <SharePie
            data={deviceShare}
            size={190}
            thickness={22}
            centerValue={topDevice ? formatPct(topDevice.value, 0) : '—'}
            centerLabel={topDevice?.label}
          />
          <div className="w-full max-w-[250px] space-y-2.5">
            <ShareList
              items={deviceShare}
              editing={editing}
              onChange={(next) => patch({ deviceShare: next })}
              addLabel="Добавить тип экрана"
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-line p-5 pb-4">
          <div>
            <h3 className="font-display text-base font-semibold text-ink">
              География аудитории
            </h3>
            <p className="text-[13px] text-ink-muted">
              Доля зрителей по городам Узбекистана
            </p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-900">
            <MapPin size={18} />
          </span>
        </div>
        <div className="max-h-[330px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-paper/95 backdrop-blur-sm">
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                <th className="px-5 py-2.5 text-left">Город</th>
                <th className="px-5 py-2.5 text-right">Зрители</th>
                {editing && <th className="px-3 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {cityShare.map((city) => (
                <tr key={city.id} className="hover:bg-ink/1.5">
                  <td className="px-5 py-2.5 font-medium text-ink-soft">
                    <EditText
                      editing={editing}
                      value={city.name}
                      onChange={(name) =>
                        patch({
                          cityShare: cityShare.map((c) =>
                            c.id === city.id ? { ...c, name } : c,
                          ),
                        })
                      }
                    />
                  </td>
                  <td className="relative px-5 py-2.5 text-right">
                    {!editing && (
                      <span
                        className="absolute inset-y-1.5 right-3 rounded-md bg-indigo-100"
                        style={{ width: `${Math.max(city.value, 4)}%` }}
                      />
                    )}
                    <span className="relative font-semibold text-ink tnum">
                      <EditNumber
                        editing={editing}
                        value={city.value}
                        onChange={(value) =>
                          patch({
                            cityShare: cityShare.map((c) =>
                              c.id === city.id ? { ...c, value } : c,
                            ),
                          })
                        }
                      >
                        {formatPct(city.value, 2)}
                      </EditNumber>
                    </span>
                  </td>
                  {editing && (
                    <td className="px-3 py-2.5">
                      <RemoveButton
                        onClick={() =>
                          patch({
                            cityShare: cityShare.filter(
                              (c) => c.id !== city.id,
                            ),
                          })
                        }
                        label={`Удалить ${city.name}`}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editing && (
          <div className="px-5 pb-4 pt-1">
            <AddButton
              onClick={() =>
                patch({
                  cityShare: [
                    ...cityShare,
                    { id: uid('city'), name: 'Новый город', value: 0 },
                  ],
                })
              }
            >
              Добавить город
            </AddButton>
          </div>
        )}
      </Card>
    </div>
  )
}

// Иконки сводных цифр YouTube: порядок тот же, что в выгрузке аналитики.
const YT_ICONS = [Eye, ThumbsUp, ThumbsDown, MessageSquare, Timer]

/** Одна доля разбивки: подпись сверху, процент снизу. */
function YoutubeShare({ item, color, editing, onChange }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface px-2.5 py-2 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50">
      <div className="flex min-w-0 items-center justify-center gap-1.5">
        {/* Метка цвета связывает подпись с сектором диаграммы. */}
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-[2px]"
          style={{ background: color }}
        />
        <span className="min-w-0 truncate text-[11px] font-medium text-ink-muted">
          <EditText
            editing={editing}
            value={item.label}
            onChange={(label) => onChange({ ...item, label })}
            className="text-center"
          />
        </span>
      </div>
      <div className="mt-1 text-[13px] font-semibold text-ink tnum">
        <EditNumber
          editing={editing}
          value={item.value}
          onChange={(value) => onChange({ ...item, value })}
        >
          {formatPct(item.value, 1)}
        </EditNumber>
      </div>
    </div>
  )
}

/**
 * Отчёт YouTube-канала: сводные цифры выгрузки и разбивка аудитории.
 * Данные ведутся вручную — в API этого раздела пока нет.
 */
/**
 * Порядок карточек разбивки. Задаём его на отрисовке, а не только в сиде:
 * месяцы, сохранённые раньше, помнят прежний порядок и сами его не меняют.
 * Незнакомая группа уходит в конец, а не теряется.
 */
const YT_BREAKDOWN_ORDER = ['yt_age', 'yt_gender', 'yt_device', 'yt_geo']

const ytGroupRank = (id) => {
  const index = YT_BREAKDOWN_ORDER.indexOf(id)
  return index === -1 ? YT_BREAKDOWN_ORDER.length : index
}

function YoutubeAnalytics({ data, editing, patch }) {
  const youtube = data.youtube
  const setYoutube = (part) => patch({ youtube: { ...youtube, ...part } })
  const breakdown = [...youtube.breakdown].sort(
    (a, b) => ytGroupRank(a.id) - ytGroupRank(b.id),
  )

  const setTotal = (next) =>
    setYoutube({
      totals: youtube.totals.map((item) => (item.id === next.id ? next : item)),
    })

  const setItem = (groupId, next) =>
    setYoutube({
      breakdown: youtube.breakdown.map((group) =>
        group.id === groupId
          ? {
              ...group,
              items: group.items.map((item) =>
                item.id === next.id ? next : item,
              ),
            }
          : group,
      ),
    })

  return (
    <div>
      {/* Шапка того же вида, что у общей статистики эфира: раздел читается
          как её продолжение, а не как чужая карточка. */}
      <section className="relative overflow-hidden rounded-[28px] border border-indigo-200 bg-linear-to-br from-surface via-[#fffdf5] to-indigo-100 p-5 shadow-lift sm:p-7">
        <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full border border-indigo-300/60" />
        <div className="pointer-events-none absolute -right-8 -top-12 h-44 w-44 rounded-full bg-indigo-200/45 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-800">
              <Youtube size={13} className="text-danger" />
              YouTube Analytics
            </div>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
              Статистика YouTube канала
            </h2>
            <div className="mt-1 max-w-xl text-sm text-ink-muted">
              <EditText
                editing={editing}
                value={youtube.channel}
                onChange={(channel) => setYoutube({ channel })}
              />
            </div>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {youtube.totals.map((item, index) => {
            const Icon = YT_ICONS[index] ?? Eye
            return (
              <div
                key={item.id}
                className="group rounded-2xl border border-line bg-surface p-4 shadow-soft transition-colors hover:border-indigo-300"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 flex-1 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">
                    <EditText
                      editing={editing}
                      value={item.label}
                      onChange={(label) => setTotal({ ...item, label })}
                    />
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-900 transition-transform group-hover:scale-105">
                    <Icon size={16} />
                  </span>
                </div>
                <div className="mt-3 font-display text-2xl font-semibold text-ink tnum">
                  <EditNumber
                    editing={editing}
                    value={item.value}
                    onChange={(value) => setTotal({ ...item, value })}
                  >
                    {formatNumber(item.value)}
                  </EditNumber>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Разбивка аудитории: каждая группа — своя карточка, иначе на узком
          экране двадцать колонок в строку не помещаются. */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {breakdown.map((group) => (
          <Card
            key={group.id}
            className="p-5 transition-colors hover:border-indigo-300"
          >
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              {group.title}
            </h4>
            {/* Кольцо показывает соотношение, подписи рядом — точные доли:
                по цвету одному их различать нельзя. */}
            <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <SharePie data={group.items} size={148} thickness={26} />
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
                {group.items.map((item, index) => (
                  <YoutubeShare
                    key={item.id}
                    item={item}
                    color={colorAt(item, index)}
                    editing={editing}
                    onChange={(next) => setItem(group.id, next)}
                  />
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, canEdit, isAdvertiser } = useAuth()
  const { overviewFor, saveOverview, resetOverview } = useData()
  const toast = useToast()
  const confirm = useConfirm()
  const firstName = user.name.split(' ')[0]

  // Обзор ведётся помесячно: по умолчанию открываем текущий месяц.
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const period = `${year}-${String(month + 1).padStart(2, '0')}`
  const years = [now.getFullYear() - 1, now.getFullYear()]
  const overview = overviewFor(period)

  // Разделы обзора разведены по вкладкам: цифр много, на одной странице
  // они не читаются.
  const [tab, setTab] = useState('media')

  // Правки копим в черновике: «Отмена» возвращает сохранённые данные.
  const [draft, setDraft] = useState(null)
  const editing = draft != null
  const data = draft ?? overview

  // Сменили период — черновик прошлого месяца за собой не тащим.
  // Крестик у вкладок (и повторный клик по месяцу) снимают выбор — в обзоре
  // «без месяца» смотреть нечего, поэтому возвращаемся к текущему.
  const pickMonth = (nextMonth) => {
    setDraft(null)
    if (nextMonth == null) {
      setYear(now.getFullYear())
      setMonth(now.getMonth())
      return
    }
    setMonth(nextMonth)
  }

  const pickYear = (nextYear) => {
    setDraft(null)
    setYear(nextYear)
  }

  const patch = (part) => setDraft((current) => ({ ...current, ...part }))

  const save = () => {
    saveOverview(period, draft)
    setDraft(null)
    toast.success(
      `Обзор за ${MONTHS_FULL[month].toLowerCase()} ${year} сохранён`,
    )
  }

  const reset = async () => {
    const ok = await confirm({
      title: 'Вернуть демо-данные?',
      description: `Обзор за ${MONTHS_FULL[month].toLowerCase()} ${year}`,
      body: 'Все правки за этот месяц будут заменены исходными значениями.',
    })
    if (!ok) return
    resetOverview(period)
    setDraft(null)
    toast.info('Обзор сброшен к демо-данным')
  }

  return (
    <div>
      <PageHeader
        title={`Здравствуйте, ${firstName}`}
        subtitle={
          editing
            ? 'Правьте цифры прямо в карточках — изменения сохранятся по кнопке.'
            : `Сводка ${
                isAdvertiser
                  ? 'по вашим медиаразмещениям'
                  : 'медиаразмещений и социальных сетей'
              } за ${MONTHS_FULL[month].toLowerCase()} ${year}.`
        }
      >
        {/* Данные обзора ведёт площадка: наблюдателю кнопки не показываем. */}
        {canEdit &&
          !isAdvertiser &&
          (editing ? (
            <>
              <Button
                variant="ghost"
                onClick={reset}
                title="Вернуть демо-данные"
              >
                <RotateCcw size={16} />
                Сбросить
              </Button>
              <Button variant="secondary" onClick={() => setDraft(null)}>
                <X size={16} />
                Отмена
              </Button>
              <Button variant="primary" onClick={save}>
                <Check size={16} />
                Сохранить
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={() => setDraft(cloneDraft(overview))}
            >
              <Pencil size={16} />
              Редактировать
            </Button>
          ))}
      </PageHeader>

      {/* Период обзора: цифры на странице ведутся помесячно. */}
      <div className="mb-4">
        <MonthTabs
          year={year}
          years={years}
          onYearChange={pickYear}
          value={month}
          onChange={pickMonth}
          // В обзоре месяц обязателен, поэтому сброс возвращает к текущему.
          resetLabel="Вернуться к текущему месяцу"
        />
      </div>

      <div className="mb-4">
        <SegmentTabs
          items={[
            { value: 'media', label: 'Медиа и аудитория' },
            { value: 'youtube', label: 'YouTube аналитика' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'media' ? (
        <>
          <MediaSummary data={data} editing={editing} patch={patch} />
          <AudienceAgeReport data={data} editing={editing} patch={patch} />
          <AudienceBreakdown data={data} editing={editing} patch={patch} />
        </>
      ) : (
        <YoutubeAnalytics data={data} editing={editing} patch={patch} />
      )}
    </div>
  )
}

/** Черновик правим свободно — оригинал в сторе трогать нельзя. */
function cloneDraft(overview) {
  return overview ? JSON.parse(JSON.stringify(overview)) : cloneOverview()
}
