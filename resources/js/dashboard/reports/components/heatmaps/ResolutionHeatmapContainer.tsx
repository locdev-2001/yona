import { t } from '../../../../i18n';
import BaseHeatmapContainer from './BaseHeatmapContainer';

// Port từ reports/components/heatmaps/ResolutionHeatmapContainer.vue
export default function ResolutionHeatmapContainer() {
    return (
        <BaseHeatmapContainer
            metric="resolutions_count"
            title={t('OVERVIEW_REPORTS.RESOLUTION_HEATMAP.HEADER')}
            downloadTitle="resolution_heatmap"
            heatmapKind="resolution"
            colorScheme="green"
        />
    );
}
