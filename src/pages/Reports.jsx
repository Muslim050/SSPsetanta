import { PageHeader } from '@/components/PageHeader.jsx'
import { TotalStatisticsReport } from '@/components/campaigns/CampaignReportPanels.jsx'

export default function Reports() {
  return (
    <div>
      <PageHeader />
      {/* Рекламодателю — без эфирных карточек и со своим заголовком. */}
      <TotalStatisticsReport
        title="Общая статистика Setanta Sports"
        showMetrics={false}
      />
    </div>
  )
}
