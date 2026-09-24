import { addClasses, removeClasses } from './DOMHelpers';
import { IFrameHelper } from './IFrameHelper';
import { isExpandedView } from './settingsHelper';
import { SDK_EVENTS } from './constants/sdkEvents';
import { dispatchSdkEvent } from './helpers/customEvent';

export const bubbleSVG =
    'M240.808 240.808H122.123C56.6994 240.808 3.45695 187.562 3.45695 122.122C3.45695 56.7031 56.6994 3.45697 122.124 3.45697C187.566 3.45697 240.808 56.7031 240.808 122.122V240.808Z';

export const body = document.getElementsByTagName('body')[0];
export const widgetHolder = document.createElement('div');

export const bubbleHolder = document.createElement('div');
export const chatBubble = document.createElement('button');
export const closeBubble = document.createElement('button');
export const notificationBubble = document.createElement('span');

const UNREAD_BADGE_LIMIT = 9;

export const formatUnreadBadge = (unreadCount: number): string =>
    unreadCount > UNREAD_BADGE_LIMIT ? `${UNREAD_BADGE_LIMIT}+` : String(unreadCount);

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
    bubbleIcon.setAttributeNS(null, 'viewBox', '0 0 240 240');
    bubbleIcon.setAttributeNS(null, 'fill', 'none');
    bubbleIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const bubblePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    bubblePath.setAttributeNS(null, 'd', path);
    bubblePath.setAttributeNS(null, 'fill', '#FFFFFF');

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
    target.title = 'Open chat window';

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
