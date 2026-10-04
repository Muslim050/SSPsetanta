import {
  LayoutDashboard,
  Megaphone,
  Building2,
  Radio,
  LineChart,
  FileText,
} from 'lucide-react'

export const NAV = [
  {
    to: '/app/campaigns',
    label: 'Кампании',
    icon: Megaphone,
    roles: ['admin', 'viewer', 'advertiser'],
  },
  {
    to: '/app/agreements',
    label: 'Договоры',
    icon: FileText,
    roles: ['advertiser', 'admin'],
  },
  {
    to: '/app/overview',
    label: 'Статистика',
    icon: LayoutDashboard,
    roles: ['admin', 'viewer'],
  },
  {
    to: '/app/contracts',
    label: 'Contract Overview',
    icon: FileText,
    roles: ['admin', 'viewer'],
  },
  {
    to: '/app/advertisers',
    label: 'Рекламодатели',
    icon: Building2,
    roles: ['admin', 'viewer'],
  },
  {
    to: '/app/channels',
    label: 'Площадки',
    icon: Radio,
    roles: ['admin', 'viewer', 'advertiser'],
    hidden: true,
  },
  {
    to: '/app/reports',
    label: 'Статистика',
    icon: LineChart,
    roles: ['advertiser'],
  },
]
