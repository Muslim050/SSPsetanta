import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'
import type { Role } from '@/api/types'
import { useAuthStore } from '@/stores/authStore'
import { AppShell } from '@/components/layout/AppShell.jsx'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard.jsx'
import Campaigns from '@/pages/Campaigns.jsx'
import CampaignStats from '@/pages/CampaignStats.jsx'
import Advertisers from '@/pages/Advertisers.jsx'
import ContractOverview from '@/pages/ContractOverview.jsx'
import ContractList from '@/pages/ContractList.jsx'
import Channels from '@/pages/Channels.jsx'
import Reports from '@/pages/Reports.jsx'
import NotFound from '@/pages/NotFound.jsx'
import Watch from '@/pages/Watch.jsx'

/** Стартовый экран обеих ролей. */
const HOME = '/app/campaigns' as const

const currentUser = () => useAuthStore.getState().user

/**
 * Доступ к разделу по ролям. Проверка живёт в beforeLoad, то есть
 * срабатывает до рендера страницы — в отличие от прежней обёртки
 * <Protected>, которая успевала смонтировать экран и только потом
 * уводила с него.
 */
function requireRoles(roles: Role[]) {
  return () => {
    const user = currentUser()
    if (!user) throw redirect({ to: '/login' })
    if (!roles.includes(user.role)) throw redirect({ to: HOME })
  }
}

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFound,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    if (currentUser()) throw redirect({ to: HOME })
  },
  component: Login,
})

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app',
  beforeLoad: () => {
    if (!currentUser()) throw redirect({ to: '/login' })
  },
  component: AppShell,
})

const appIndexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: HOME })
  },
})

/**
 * Выбор на «Рекламных размещениях» живёт в адресе — после перезагрузки или
 * по ссылке откроется тот же бренд, договор, месяц и вкладка отчёта:
 * `?brand=12&contract=№20-02.2025&year=2026&month=1&view=stats&tab=total`.
 * month — 1…12, как в календаре. Чего нет или значение кривое — параметра
 * нет; на существование бренда и договора проверяет сама страница.
 */
export interface CampaignsSearch {
  brand?: number
  contract?: string
  year?: number
  month?: number
  view?: 'stats' | 'campaigns'
  tab?: string
}

const positiveInt = (value: unknown) => {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : undefined
}

// Номер договора бывает и из одних цифр — роутер прочтёт его числом.
const text = (value: unknown) =>
  (typeof value === 'string' || typeof value === 'number') && value !== ''
    ? String(value)
    : undefined

const campaignsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'campaigns',
  validateSearch: (search: Record<string, unknown>): CampaignsSearch => {
    const month = positiveInt(search.month)
    return {
      brand: positiveInt(search.brand),
      contract: text(search.contract),
      year: positiveInt(search.year),
      month: month && month <= 12 ? month : undefined,
      view:
        search.view === 'stats' || search.view === 'campaigns'
          ? search.view
          : undefined,
      tab: text(search.tab),
    }
  },
  component: Campaigns,
})

const campaignStatsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'campaigns/$campaignId',
  component: CampaignStats,
})

const contractsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'contracts',
  // Наблюдатель раздел видит, но ничего в нём не правит: суммы и статусы
  // закрыты по canEdit внутри самой страницы.
  beforeLoad: requireRoles(['admin', 'viewer']),
  component: ContractOverview,
})

/**
 * Пользователи переехали вкладкой в «Рекламодателей». Маршрут оставлен,
 * чтобы старые ссылки и закладки не упирались в «страница не найдена».
 */
const usersRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'users',
  beforeLoad: () => {
    throw redirect({ to: '/app/advertisers' })
  },
})

const advertisersRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'advertisers',
  beforeLoad: requireRoles(['admin', 'viewer']),
  component: Advertisers,
})

const overviewRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'overview',
  beforeLoad: requireRoles(['admin', 'viewer']),
  component: Dashboard,
})

const channelsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'channels',
  component: Channels,
})

// Вкладка «Договоры»: рекламодателю — договоры его бренда без денег,
// площадке — договоры всех брендов. Суммы и оплаты по месяцам — в Contract
// Overview.
const agreementsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'agreements',
  beforeLoad: requireRoles(['advertiser', 'admin']),
  component: ContractList,
})

const reportsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'reports',
  beforeLoad: requireRoles(['advertiser']),
  component: Reports,
})

/**
 * Ролик на всю вкладку: `?src=<адрес файла>&name=<имя>`. Без входа — файл
 * и так отдаётся по слагу без авторизации. Адрес берём только http(s).
 */
export interface WatchSearch {
  src?: string
  name?: string
}

const httpUrl = (value: unknown) => {
  if (typeof value !== 'string') return undefined
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:' ? value : undefined
  } catch {
    return undefined
  }
}

const watchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/watch',
  validateSearch: (search: Record<string, unknown>): WatchSearch => ({
    src: httpUrl(search.src),
    name: text(search.name),
  }),
  component: Watch,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: currentUser() ? HOME : '/login' })
  },
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  watchRoute,
  appRoute.addChildren([
    appIndexRoute,
    campaignsRoute,
    campaignStatsRoute,
    contractsRoute,
    agreementsRoute,
    advertisersRoute,
    usersRoute,
    overviewRoute,
    channelsRoute,
    reportsRoute,
  ]),
])

export const router = createRouter({ routeTree })

export { campaignStatsRoute }

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
