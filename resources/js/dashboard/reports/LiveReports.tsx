import Dashboard from '../Dashboard';
import { t } from '../../i18n';
import AgentLiveReportContainer from './components/AgentLiveReportContainer';
import ReportHeader from './components/ReportHeader';
import ReportsWrapper from './components/ReportsWrapper';
import StatsLiveReportsContainer from './components/StatsLiveReportsContainer';
import TeamLiveReportContainer from './components/TeamLiveReportContainer';
import ConversationHeatmapContainer from './components/heatmaps/ConversationHeatmapContainer';
import ResolutionHeatmapContainer from './components/heatmaps/ResolutionHeatmapContainer';

// Port từ reports/LiveReports.vue (route `/reports/overview`).
export default function LiveReports() {
    return (
        <Dashboard>
            <ReportsWrapper>
                <ReportHeader headerTitle={t('OVERVIEW_REPORTS.HEADER')} />
                <div className="flex flex-col gap-4 pb-6">
                    <StatsLiveReportsContainer />
                    <ConversationHeatmapContainer />
                    <ResolutionHeatmapContainer />
                    <AgentLiveReportContainer />
                    <TeamLiveReportContainer />
                </div>
            </ReportsWrapper>
        </Dashboard>
    );
}
