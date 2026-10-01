// Icon `i-lucide-*` cho các trang console chưa chuyển sang bộ component mới
// (nạp qua @plugin trong resources/css/admin/legacy-console.css). Xoá cùng file đó.
const { iconsPlugin, getIconCollections } = require('@egoist/tailwindcss-icons');

module.exports = iconsPlugin({ collections: getIconCollections(['lucide']) });
