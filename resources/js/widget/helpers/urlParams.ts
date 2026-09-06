// Port từ widget/helpers/urlParamsHelper.js — phần đọc tham số của trang widget.
// buildPopoutURL/popoutChatWindow dùng chung bản của SDK (sdk/helpers/popoutHelper.ts).

export const getLocale = (search = ''): string | null => new URLSearchParams(search).get('locale');

export const getWebsiteToken = (search = ''): string => new URLSearchParams(search).get('website_token') ?? '';

// Cookie phiên khách do SDK gắn vào URL iframe (`cw_conversation`).
export const getConversationCookie = (search = ''): string =>
    new URLSearchParams(search).get('cw_conversation') ?? '';
