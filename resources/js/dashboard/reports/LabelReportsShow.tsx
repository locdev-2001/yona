import EntityReportsPage from './components/EntityReportsPage';

// Port từ reports/LabelReportsShow.vue — `route.params.id` thành prop Inertia.
export default function LabelReportsShow({ id }: { id: number }) {
    return <EntityReportsPage type="label" id={id} />;
}
