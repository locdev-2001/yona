import EntityReportsPage from './components/EntityReportsPage';

// Port từ reports/InboxReportsShow.vue — `route.params.id` thành prop Inertia.
export default function InboxReportsShow({ id }: { id: number }) {
    return <EntityReportsPage type="inbox" id={id} />;
}
