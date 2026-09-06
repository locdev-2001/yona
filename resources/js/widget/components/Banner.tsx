import { useWidgetState } from '../store/hooks';

// Port từ widget/components/Banner.vue — thông báo ngắn 3 giây (store tự tắt).
export default function Banner() {
    const banner = useWidgetState(state => state.banner);
    if (!banner) return null;

    return (
        <div className={`banner ${banner.type}`}>
            <span>{banner.message}</span>
        </div>
    );
}
