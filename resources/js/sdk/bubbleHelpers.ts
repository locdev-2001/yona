import { addClasses, removeClasses } from './DOMHelpers';
import { IFrameHelper } from './IFrameHelper';
import { isExpandedView } from './settingsHelper';
import { SDK_EVENTS } from './constants/sdkEvents';
import { CHAT_BUBBLE_ICON_PATH } from './constants/chatBubbleIcon';
import { dispatchSdkEvent } from './helpers/customEvent';

export const bubbleSVG = CHAT_BUBBLE_ICON_PATH;

export const body = document.getElementsByTagName('body')[0];
export const widgetHolder = document.createElement('div');

export const bubbleHolder = document.createElement('div');
export const chatBubble = document.createElement('button');
export const closeBubble = document.createElement('button');
export const notificationBubble = document.createElement('span');

const UNREAD_BADGE_LIMIT = 9;

export const formatUnreadBadge = (unreadCount: number): string =>
    unreadCount > UNREAD_BADGE_LIMIT ? `${UNREAD_BADGE_LIMIT}+` : String(unreadCount);

// Nhãn đọc màn hình + tooltip của launcher do widget gửi sang theo ngôn ngữ của nó;
// SDK chạy trên trang khách nên không tự giữ câu chữ nào.
export const setLauncherLabels = ({ openLabel, closeLabel }: { openLabel?: string; closeLabel?: string }): void => {
    const labelledButtons: [HTMLElement, string | undefined][] = [
        [chatBubble, openLabel],
        [closeBubble, closeLabel],
    ];
    labelledButtons.forEach(([button, label]) => {
        if (!label) return;
        button.setAttribute('aria-label', label);
        button.title = label;
    });
};

export const setBubbleText = (bubbleText: string): void => {
    if (isExpandedView(window.$yona.type)) {
        const textNode = document.getElementById('woot-widget--expanded__text');
        if (textNode) textNode.innerText = bubbleText;
    }
};

export const createBubbleIcon = ({
    className,
    path,
    target,
}: {
    className: string;
    path: string;
    target: HTMLElement;
}): HTMLElement => {
    let bubbleClassName = `${className} woot-elements--${window.$yona.position}`;
    const bubbleIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    bubbleIcon.setAttributeNS(null, 'id', 'woot-widget-bubble-icon');
    bubbleIcon.setAttributeNS(null, 'width', '24');
    bubbleIcon.setAttributeNS(null, 'height', '24');
    bubbleIcon.setAttributeNS(null, 'viewBox', '0 0 24 24');
    bubbleIcon.setAttributeNS(null, 'fill', 'none');
    bubbleIcon.setAttributeNS(null, 'aria-hidden', 'true');
    bubbleIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // Bong bóng nét viền; màu nét lấy theo nền launcher trong sdk.css.
    const bubblePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    bubblePath.setAttributeNS(null, 'd', path);
    bubblePath.setAttributeNS(null, 'fill', 'none');
    bubblePath.setAttributeNS(null, 'stroke-width', '1.9');
    bubblePath.setAttributeNS(null, 'stroke-linecap', 'round');
    bubblePath.setAttributeNS(null, 'stroke-linejoin', 'round');

    bubbleIcon.appendChild(bubblePath);
    target.appendChild(bubbleIcon);

    if (isExpandedView(window.$yona.type)) {
        const textNode = document.createElement('div');
        textNode.id = 'woot-widget--expanded__text';
        textNode.innerText = '';
        target.appendChild(textNode);
        bubbleClassName += ' woot-widget--expanded';
    }

    target.className = bubbleClassName;

    return target;
};

export const createBubbleHolder = (hideMessageBubble: boolean): void => {
    if (hideMessageBubble) {
        addClasses(bubbleHolder, 'woot-hidden');
    }
    addClasses(bubbleHolder, 'woot--bubble-holder');
    bubbleHolder.id = 'cw-bubble-holder';
    bubbleHolder.dataset.turboPermanent = 'true';
    body.appendChild(bubbleHolder);
};

const handleBubbleToggle = (newIsOpen: boolean): void => {
    IFrameHelper.events.onBubbleToggle(newIsOpen);

    if (newIsOpen) {
        dispatchSdkEvent(SDK_EVENTS.OPENED);
    } else {
        dispatchSdkEvent(SDK_EVENTS.CLOSED);
        chatBubble.focus();
    }
};

export const onBubbleClick = (props: { toggleValue?: boolean } = {}): void => {
    const { toggleValue } = props;
    const { isOpen } = window.$yona;
    if (isOpen === toggleValue) return;

    const newIsOpen = toggleValue === undefined ? !isOpen : toggleValue;
    window.$yona.isOpen = newIsOpen;

    // Đặt lớp theo trạng thái đích, không lật: khung xem trước tin mới làm khung
    // widget hiện ra trong khi launcher vẫn đóng.
    chatBubble.classList.toggle('woot--hide', newIsOpen);
    closeBubble.classList.toggle('woot--hide', !newIsOpen);
    widgetHolder.classList.toggle('woot--hide', !newIsOpen);

    handleBubbleToggle(newIsOpen);
};

export const onClickChatBubble = (): void => {
    bubbleHolder.addEventListener('click', () => onBubbleClick());
};

export const addUnreadClass = (): void => {
    addClasses(document.querySelector('.woot-widget-holder'), 'has-unread-view');
};

export const removeUnreadClass = (): void => {
    removeClasses(document.querySelector('.woot-widget-holder'), 'has-unread-view');
};

// Khung xem trước tin mới không phải trạng thái mở: launcher giữ bong bóng và badge
// số chưa đọc, khách chưa mở khung chat thật thì tin vẫn là chưa đọc.
export const showUnreadPreview = (): void => {
    addUnreadClass();
    removeClasses(widgetHolder, 'woot--hide');
};

export const hideUnreadPreview = (): void => {
    removeUnreadClass();
    if (!window.$yona.isOpen) addClasses(widgetHolder, 'woot--hide');
};
