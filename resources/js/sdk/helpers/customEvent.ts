// Port: refs/chatwoot/app/javascript/shared/helpers/CustomEventHelper.js
export const createEvent = ({ eventName, data = null }: { eventName: string; data?: unknown }): Event => {
    if (typeof window.CustomEvent === 'function') {
        return new CustomEvent(eventName, { detail: data });
    }

    const event = document.createEvent('CustomEvent');
    event.initCustomEvent(eventName, false, false, data);

    return event;
};

export const dispatchWindowEvent = ({ eventName, data }: { eventName: string; data?: unknown }): void => {
    window.dispatchEvent(createEvent({ eventName, data }));
};
