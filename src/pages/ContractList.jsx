import { useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, Download, FileText, Package, Trophy } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { useVisibleAdvertisers } from '@/features/advertisers/queries'
import { advertiserLogo } from '@/features/advertisers/logo'
import { downloadFile } from '@/features/files/download'
import { Card } from '@/components/ui/Card.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Avatar } from '@/components/ui/Avatar.jsx'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState.jsx'
import { Loader } from '@/components/ui/Loader.jsx'
import { FadeIn } from '@/components/ui/FadeIn.jsx'
import { ContractPreviewModal } from '@/components/campaigns/ContractPreviewModal.jsx'
import { BrandTabs } from '@/components/campaigns/BrandTabs.jsx'
import { CONTRACT_STATUS, PACKAGES, leagueLabel } from '@/lib/metrics.js'
import { formatDate } from '@/lib/format.js'

const ALL_BRANDS = 'all'

/** Срок договора одной строкой: «01.01.2026 — 31.12.2026». */
const term = (contract) =>
  [contract.start, contract.end].filter(Boolean).map(formatDate).join(' — ')

/** Строка условия в карточке: иконка, подпись и значение. */
function Term({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2 text-[13px]">
      <Icon size={15} className="mt-0.5 shrink-0 text-ink-muted" />
      <span className="w-16 shrink-0 text-ink-muted">{label}</span>
      <span className="min-w-0 flex-1 text-ink">{children || '—'}</span>
    </div>
  )
}

/**
 * Вкладка «Договоры»: карточки договоров на просмотр, по клику — карточка
 * договора с условиями плитками.
 *
 * Рекламодатель видит только договоры своего бренда и без денег (бюджет,
 * оплаты — внутренняя кухня площадки). Название кампании и ролик он
 * заполняет на странице «Кампании». Площадке видны договоры всех брендов —
 * на карточке подписано, чей договор, — а в окне есть бюджет и выплаты.
 */
export default function ContractList() {
  const { isAdvertiser } = useAuth()
  // Рекламодателю сервер отдаёт только его бренд, площадке — все бренды;
  // договоры приходят внутри брендов.
  const {
    data: advertisers = [],
    isPending,
    isError,
    error,
    refetch,
  } = useVisibleAdvertisers()
  const items = [...advertisers]
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    .flatMap((advertiser) =>
      (advertiser.contracts ?? []).map((contract) => ({
        contract,
        advertiser,
      })),
    )
  // Открытый в окне договор вместе с брендом: null — окно закрыто.
  const [opened, setOpened] = useState(null)
  const [brandId, setBrandId] = useState(ALL_BRANDS)

  // Вкладки рекламодателей — площадке, у которой брендов много. Только
  // бренды с договорами; счётчики — договоры и сколько из них активны.
  const activeCount = (list) =>
    list.filter((item) => item.contract.status === 'active').length
  const brands = isAdvertiser
    ? []
    : [
        {
          id: ALL_BRANDS,
          name: 'Все',
          count: items.length,
          active: activeCount(items),
        },
        ...advertisers
          .map((advertiser) => {
            const own = items.filter((item) => item.advertiser === advertiser)
            return {
              id: advertiser.id,
              name: advertiser.name,
              color: advertiser.color,
              logo: advertiserLogo(advertiser),
              count: own.length,
              active: activeCount(own),
            }
          })
          .filter((brand) => brand.count > 0)
          .sort((a, b) => a.name.localeCompare(b.name, 'ru')),
      ]
  // Выбранный бренд мог пропасть (договоры удалили) — тогда «Все».
  const activeBrand = brands.some((brand) => brand.id === brandId)
    ? brandId
    : ALL_BRANDS
  const shownItems =
    activeBrand === ALL_BRANDS
      ? items
      : items.filter((item) => item.advertiser.id === activeBrand)

  if (isPending) return <Loader label="Загружаем договоры…" />

  return (
    <FadeIn>
      {isError ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="Не удалось загрузить договоры"
            description={error?.message ?? 'Попробуйте ещё раз.'}
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Повторить
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {brands.length > 2 && (
            <BrandTabs
              items={brands}
              value={activeBrand}
              onChange={setBrandId}
              noun="договоров"
              className="mb-4"
            />
          )}
          {items.length === 0 ? (
            <Card>
              <EmptyState
                icon={FileText}
                title="Договоров пока нет"
                description={
                  isAdvertiser
                    ? 'Договоры заводит площадка — как только договор появится, он будет здесь.'
                    : 'Договоры заводятся в карточке рекламодателя.'
                }
              />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shownItems.map(({ contract, advertiser }, i) => {
                const status = CONTRACT_STATUS[contract.status]
                return (
                  <motion.div
                    key={contract.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.35 }}
                  >
                    <Card hover className="flex h-full flex-col p-5">
                      {/* Вся верхняя часть открывает договор; кнопка скачивания
                      внизу — отдельно, чтобы не открывать окно ради файла. */}
                      <button
                        type="button"
                        onClick={() => setOpened({ contract, advertiser })}
                        className="flex flex-1 flex-col gap-4 rounded-xl text-left focus-ring"
                        aria-label={`Открыть договор ${contract.number}`}
                      >
                        {/* Площадке — чей договор: брендов у неё много. */}
                        {!isAdvertiser && (
                          <div className="flex min-w-0 items-center gap-2">
                            <Avatar
                              name={advertiser.name}
                              color={advertiser.color}
                              src={advertiserLogo(advertiser)}
                              size="sm"
                            />
                            <span className="truncate text-[13px] font-medium text-ink-soft">
                              {advertiser.name}
                            </span>
                          </div>
                        )}
                        <div className="flex w-full items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-900">
                              <FileText size={18} />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-display text-[15px] font-semibold text-ink">
                                {contract.number}
                              </p>
                              <p className="truncate text-[12px] text-ink-muted">
                                {contract.campaignName ||
                                  'Рекламная кампания не указана'}
                              </p>
                            </div>
                          </div>
                          {status && (
                            <Badge tone={status.tone} dot className="shrink-0">
                              {status.label}
                            </Badge>
                          )}
                        </div>

                        <div className="w-full space-y-2 border-t border-line pt-4">
                          <Term icon={CalendarDays} label="Срок">
                            {term(contract)}
                          </Term>
                          <Term icon={Package} label="Пакет">
                            {PACKAGES[contract.package]?.label}
                          </Term>
                          <Term icon={Trophy} label="Лиги">
                            {(contract.leagues ?? [])
                              .map(leagueLabel)
                              .join(', ')}
                          </Term>
                        </div>
                      </button>

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
                        {contract.file?.url ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => downloadFile(contract.file)}
                            title={contract.file.name}
                          >
                            <Download size={15} />
                            Скачать договор
                          </Button>
                        ) : (
                          <span className="text-[12px] text-ink-muted">
                            Файл договора не приложен
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setOpened({ contract, advertiser })}
                        >
                          Подробнее
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </>
      )}

      <ContractPreviewModal
        contract={opened?.contract ?? null}
        advertiser={opened?.advertiser}
        onClose={() => setOpened(null)}
        // Рекламодателю денег не показываем — у площадки бюджет и выплаты.
        showBudget={!isAdvertiser}
      />
    </FadeIn>
  )
}
