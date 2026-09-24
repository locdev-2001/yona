import { useId, useState } from 'react';
import { createPortal } from 'react-dom';

import { getContrastingTextColor } from '../helpers/colorHelper';
import { IFrameHelper } from '../helpers/iframe';
import { useWidgetState } from '../store/hooks';
import { HEADER_ACTION_CLASS } from './headerActionClass';
import { t } from '../i18n';
import { RESET_SESSION_EVENT } from '../../sdk/constants/frameEvents';

const DIALOG_BUTTON_CLASS = 'h-11 px-4 rounded text-sm font-medium leading-5 active:scale-[0.97]';

// Khách chủ động bỏ phiên hiện tại. Widget không tự xoá gì: SDK giữ đường xoá phiên duy nhất
// (cookie trang chủ + dựng lại iframe với cờ phiên mới), dùng chung với $yona.reset().
export default function ResetSessionButton() {
    const [isConfirming, setConfirming] = useState(false);
    const widgetColor = useWidgetState(state => state.appConfig.widgetColor);
    const titleId = useId();
    const bodyId = useId();

    const startNewSession = () => {
        setConfirming(false);
        IFrameHelper.sendMessage({ event: RESET_SESSION_EVENT });
    };

    return (
        <>
            <button
                type="button"
                className={HEADER_ACTION_CLASS}
                title={t('RESET_SESSION.BUTTON')}
                aria-label={t('RESET_SESSION.BUTTON')}
                onClick={() => setConfirming(true)}
            >
                <span className="i-lucide-rotate-ccw size-5" />
            </button>
            {isConfirming
                ? createPortal(
                      <div
                          className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-n-alpha-black2"
                          onClick={() => setConfirming(false)}
                          onKeyDown={event => {
                              if (event.key !== 'Escape') return;
                              // Esc chỉ đóng hộp xác nhận, không lan lên khung chat (Esc ở đó đóng widget).
                              event.stopPropagation();
                              setConfirming(false);
                          }}
                      >
                          <div
                              role="alertdialog"
                              aria-modal="true"
                              aria-labelledby={titleId}
                              aria-describedby={bodyId}
                              className="flex flex-col w-full gap-3 p-5 border bg-n-background border-n-weak"
                              onClick={event => event.stopPropagation()}
                          >
                              <h2 id={titleId} className="text-base font-medium leading-6 text-n-slate-12">
                                  {t('RESET_SESSION.CONFIRM_TITLE')}
                              </h2>
                              <p id={bodyId} className="text-sm leading-5 text-n-slate-11">
                                  {t('RESET_SESSION.CONFIRM_BODY')}
                              </p>
                              <div className="flex justify-end gap-2 mt-1">
                                  <button
                                      type="button"
                                      autoFocus
                                      className={`${DIALOG_BUTTON_CLASS} border border-n-slate-12 text-n-slate-12`}
                                      onClick={() => setConfirming(false)}
                                  >
                                      {t('RESET_SESSION.CANCEL')}
                                  </button>
                                  <button
                                      type="button"
                                      className={DIALOG_BUTTON_CLASS}
                                      style={{ backgroundColor: widgetColor, color: getContrastingTextColor(widgetColor) }}
                                      onClick={startNewSession}
                                  >
                                      {t('RESET_SESSION.CONFIRM')}
                                  </button>
                              </div>
                          </div>
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}
