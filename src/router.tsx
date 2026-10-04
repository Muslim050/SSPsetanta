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

const campaignsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'campaigns',
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
