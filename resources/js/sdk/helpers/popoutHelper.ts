// Port: refs/chatwoot/app/javascript/widget/helpers/{popoutHelper,urlParamsHelper}.js
export const buildPopoutURL = ({
    origin,
    conversationCookie,
    websiteToken,
    locale,
}: {
    origin: string;
    conversationCookie?: string;
    websiteToken: string;
    locale?: string;
}): string => {
    const popoutUrl = new URL('/widget', origin);
    popoutUrl.searchParams.append('cw_conversation', String(conversationCookie));
    popoutUrl.searchParams.append('website_token', websiteToken);
    popoutUrl.searchParams.append('locale', String(locale));

    return popoutUrl.toString();
};

export const popoutChatWindow = (
    origin: string,
    websiteToken: string,
    locale: string | undefined,
    conversationCookie: string | undefined,
): void => {
    try {
        const popoutWindow = window.open(
            buildPopoutURL({ origin, websiteToken, locale, conversationCookie }),
            `webwidget_session_${websiteToken}`,
            'resizable=off,width=400,height=600',
        );
        popoutWindow?.focus();
    } catch (error) {
        // eslint-disable-next-line no-console
        console.log(error);
    }
};
