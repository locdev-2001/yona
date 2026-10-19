import EntityReportsPage from './components/EntityReportsPage';

// Port từ reports/TeamReportsShow.vue — `route.params.id` thành prop Inertia.
export default function TeamReportsShow({ id }: { id: number }) {
    return <EntityReportsPage type="team" id={id} />;
}
