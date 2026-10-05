import {
  LayoutDashboard,
  Megaphone,
  Building2,
  Radio,
  FileText,
} from 'lucide-react'

export const NAV = [
  {
    to: '/app/campaigns',
    label: 'Рекламные размещения',
    icon: Megaphone,
    roles: ['admin', 'viewer', 'advertiser'],
  },
  {
    to: '/app/overview',
    label: 'Статистика',
    icon: LayoutDashboard,
    roles: ['admin', 'viewer'],
  },
  {
    to: '/app/reports',
    label: 'Статистика',
    icon: LayoutDashboard,
    roles: ['advertiser'],
  },
  {
    to: '/app/contracts',
    label: 'Статус оплаты',
    icon: FileText,
    roles: ['admin', 'viewer'],
  },
  {
    to: '/app/agreements',
    label: 'Договоры',
    icon: FileText,
    roles: ['advertiser', 'admin'],
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
]
