import EntityReportsPage from './components/EntityReportsPage';

// Port từ reports/AgentReports.vue
export default function AgentReports() {
    return <EntityReportsPage type="agent" downloadLabelKey="REPORT.DOWNLOAD_AGENT_REPORTS" />;
}
