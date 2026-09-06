import EntityReportsPage from './components/EntityReportsPage';

// Port từ reports/AgentReportsShow.vue — `route.params.id` thành prop Inertia.
export default function AgentReportsShow({ id }: { id: number }) {
    return <EntityReportsPage type="agent" id={id} />;
}
