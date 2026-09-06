// Port từ survey/components/Banner.vue.
interface BannerProps {
    showSuccess?: boolean;
    showError?: boolean;
    message: string;
}

export default function Banner({ showSuccess = false, showError = false, message }: BannerProps) {
    return (
        <div className="flex items-center">
            {showSuccess ? <i className="ion-checkmark-circled text-3xl text-green-500 mr-1" /> : null}
            {showError ? <i className="ion-android-alert text-3xl text-red-600 mr-1" /> : null}
            <label className="text-base font-medium text-n-slate-12 mt-4 mb-4">{message}</label>
        </div>
    );
}
