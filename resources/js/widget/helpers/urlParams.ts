import { FRAME_PROTOCOL_PARAM, FRAME_PROTOCOL_VERSION, NEW_SESSION_URL_PARAM } from '../../sdk/constants/frameEvents';

// Đọc tham số của trang widget. buildPopoutURL/popoutChatWindow dùng chung bản của SDK
// (sdk/helpers/popoutHelper.ts).

export const getLocale = (search = ''): string | null => new URLSearchParams(search).get('locale');

export const getWebsiteToken = (search = ''): string => new URLSearchParams(search).get('website_token') ?? '';

// Cookie phiên khách do SDK gắn vào URL iframe (`cw_conversation`).
export const getConversationCookie = (search = ''): string =>
    new URLSearchParams(search).get('cw_conversation') ?? '';

// Mã lần xoá phiên do SDK gắn khi dựng lại iframe cho khách mới.
export const getNewSessionResetId = (search = ''): string =>
    new URLSearchParams(search).get(NEW_SESSION_URL_PARAM) ?? '';

// SDK hiện hành gắn tham số giao thức vào URL iframe; SDK đời trước (còn trong cache) thì không.
export const hostSpeaksCurrentFrameProtocol = (search = ''): boolean =>
    new URLSearchParams(search).get(FRAME_PROTOCOL_PARAM) === FRAME_PROTOCOL_VERSION;

// Khung xem trước trong màn cấu hình widget của dashboard (`preview=1`).
export const isPreviewMode = (search = ''): boolean => new URLSearchParams(search).get('preview') === '1';
