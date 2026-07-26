import { Check, Copy, Landmark } from 'lucide-react';
import { useState } from 'react';
import type { ChatMessage } from '../message-types';
import { TypeLabel } from './type-label';

/**
 * Thẻ tài khoản ngân hàng: logo + tên ngân hàng, số tài khoản
 * (kèm nút sao chép — thao tác CRM hay dùng nhất), chủ tài khoản, ảnh VietQR.
 * Tin cũ chưa được bridge resolve (thiếu meta) → nhãn fallback.
 */
export function BankCardMessage({ msg }: { msg: ChatMessage }) {
    const card = msg.media_meta?.bank_card;
    const [copied, setCopied] = useState(false);

    if (!card || (!card.account_number && !card.bank_name)) {
        return <TypeLabel text="[Tài khoản ngân hàng]" />;
    }

    const copyAccountNumber = () => {
        if (!card.account_number || !navigator.clipboard) return;
        navigator.clipboard
            .writeText(card.account_number)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            })
            .catch(() => {});
    };

    return (
        <div className="w-72 max-w-full rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-3.5 text-white shadow-md">
            <div className="flex items-center gap-2">
                {card.logo_url ? (
                    <img src={card.logo_url} alt="" className="h-8 w-8 shrink-0 rounded-md bg-white object-contain p-0.5" loading="lazy" />
                ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10">
                        <Landmark className="h-4.5 w-4.5" />
                    </span>
                )}
                <span className="text-sm leading-tight font-medium">{card.bank_name ?? 'Tài khoản ngân hàng'}</span>
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
                <div className="min-w-0">
                    {card.account_number && (
                        <div className="flex items-center gap-1.5">
                            <span className="font-mono text-base font-semibold tracking-wider">{card.account_number}</span>
                            <button
                                type="button"
                                onClick={copyAccountNumber}
                                className="rounded p-1 opacity-70 transition-opacity hover:bg-white/10 hover:opacity-100"
                                aria-label="Sao chép số tài khoản"
                                title="Sao chép số tài khoản"
                            >
                                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                    )}
                    {card.account_holder && <div className="mt-0.5 truncate text-xs text-white/70">{card.account_holder}</div>}
                </div>

                {card.qr_url && (
                    <a href={card.qr_url} target="_blank" rel="noreferrer" className="shrink-0" title="Mở ảnh QR">
                        <img
                            src={card.qr_url}
                            alt="VietQR chuyển khoản"
                            className="h-20 w-20 rounded-md border-2 border-white/25 bg-white object-contain"
                            loading="lazy"
                        />
                    </a>
                )}
            </div>
        </div>
    );
}
