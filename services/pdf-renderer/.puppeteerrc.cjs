// Chỉ tải chrome-headless-shell (nhẹ hơn Chrome đầy đủ) vào ngay thư mục này, để
// deploy không phụ thuộc HOME của user chạy và PHP tìm được binary theo đường cố định.
const { join } = require('path');

module.exports = {
    cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
    chrome: { skipDownload: true },
    'chrome-headless-shell': { skipDownload: false },
};
