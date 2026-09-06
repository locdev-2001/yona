import { t } from '../../../../i18n';
import BaseHeatmapContainer from './BaseHeatmapContainer';

// Port từ reports/components/heatmaps/ConversationHeatmapContainer.vue
export default function ConversationHeatmapContainer() {
    return (
        <BaseHeatmapContainer
            metric="conversations_count"
            title={t('OVERVIEW_REPORTS.CONVERSATION_HEATMAP.HEADER')}
            downloadTitle="conversation_heatmap"
            heatmapKind="conversation"
            hasBackendDownload
        />
    );
}
