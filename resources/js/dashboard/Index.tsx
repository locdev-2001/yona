import Dashboard from './Dashboard';

// Trang home (ChatList + ConversationBox vào ở B3) — hiện là shell trống.
export default function DashboardIndex() {
    return (
        <Dashboard>
            <div className="flex flex-1 items-center justify-center">
                <div className="text-center select-none">
                    <span className="i-lucide-message-circle size-10 text-n-slate-8 inline-block" />
                    <p className="text-sm text-n-slate-10 mt-2 mb-0">&nbsp;</p>
                </div>
            </div>
        </Dashboard>
    );
}
