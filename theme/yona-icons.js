// Bộ icon tự vẽ `yona` (lớp `i-yona-*`). Chỉ giữ thứ Lucide và Simple Icons không
// thay được: logo kênh đơn sắc vẽ cùng nét, chỉ báo mức ưu tiên nhiều màu, ký hiệu
// HOẶC của bộ lọc và hình chấm của màn chào onboarding. Icon giao diện mới dùng Lucide
// qua resources/js/dashboard/icons.ts.
export const icons = {
  // Ghim đã đặc ruột: cùng hình `lucide:pin` nhưng tô kín để thẻ hội thoại đã ghim nổi bật.
  'pin-filled': {
    body: `<path fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4a1 1 0 0 1 1 1z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M12 17v5"/>`,
    width: 24,
    height: 24,
  },
  // Nhãn kênh Zalo — Iconify (logos/ri/lucide/ph) cũng không.
  // Vẽ tay đơn sắc theo hình khối của Zalo (bong bóng vuông bo góc + chữ Z khoét
  // rỗng) để đọc được ở 16px; dùng `currentColor` như mọi icon kênh khác.
  zalo: {
    body: `<path fill-rule="evenodd" clip-rule="evenodd" d="M5 2H19A4 4 0 0 1 23 6V14A4 4 0 0 1 19 18H8L3.2 22.2A0.8 0.8 0 0 1 2 21.3L3.4 18A4 4 0 0 1 1 14V6A4 4 0 0 1 5 2ZM7.6 6.6H16.4V8L10.4 12.4H16.4V13.8H7.6V12.4L13.6 8H7.6V6.6Z" fill="currentColor"/>`,
    width: 24,
    height: 24,
  },
  'logic-or': {
    body: `<rect x="14" y="5" width="2" height="13" rx="1" fill="currentColor"/><rect x="8" y="5" width="2" height="13" rx="1" fill="currentColor"/>`,
    width: 24,
    height: 24,
  },
  'priority-empty': {
    body: `<mask id="a" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><path fill="currentColor" d="M0 0h24v24H0z"/></mask><g mask="url(#a)" fill="currentColor"><rect x="4" y="12" width="4" height="8" rx="2"/><rect x="10" y="8" width="4" height="12" rx="2"/><rect x="16" y="4" width="4" height="16" rx="2"/></g>`,
    width: 24,
    height: 24,
  },
  'priority-low': {
    body: `<mask id="a" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><path fill="#d9d9d9" d="M0 0h24v24H0z"/></mask><g mask="url(#a)"><rect x="4" y="12" width="4" height="8" rx="2" fill="#ffc53d"/><rect x="10" y="8" width="4" height="12" rx="2" fill="#e4e4e9"/><rect x="16" y="4" width="4" height="16" rx="2" fill="#e4e4e9"/></g>`,
    width: 24,
    height: 24,
  },
  'priority-medium': {
    body: `<mask id="a" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><path fill="#d9d9d9" d="M0 0h24v24H0z"/></mask><g mask="url(#a)"><rect x="4" y="12" width="4" height="8" rx="2" fill="#ffc53d"/><rect x="10" y="8" width="4" height="12" rx="2" fill="#ffc53d"/><rect x="16" y="4" width="4" height="16" rx="2" fill="#e4e4e9"/></g>`,
    width: 24,
    height: 24,
  },
  'priority-high': {
    body: `<mask id="a" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><path fill="#ed8a5c" d="M0 0h24v24H0z"/></mask><g mask="url(#a)" fill="#ffc53d"><rect x="4" y="12" width="4" height="8" rx="2"/><rect x="10" y="8" width="4" height="12" rx="2"/><rect x="16" y="4" width="4" height="16" rx="2"/></g>`,
    width: 24,
    height: 24,
  },
  'priority-urgent': {
    body: `<mask id="a" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><path fill="#ed8a5c" d="M0 0h24v24H0z"/></mask><g mask="url(#a)" fill="#e5484d"><rect x="4" y="12" width="4" height="8" rx="2"/><rect x="10" y="8" width="4" height="12" rx="2"/><path d="M18 20q-.824 0-1.413-.49Q16 19.021 16 18.333q0-.687.587-1.177.588-.49 1.413-.49.824 0 1.413.49.587.49.587 1.177t-.587 1.177T18 20m0-5q-.824 0-1.413-.49Q16 14.021 16 13.333V6.667q0-.688.587-1.177Q17.176 5 18 5t1.413.49Q20 5.979 20 6.667v6.666q0 .688-.587 1.177Q18.825 15 18 15"/></g>`,
    width: 24,
    height: 24,
  },
  line: {
    body: `<g fill="none" stroke="currentColor"><path d="M20.8417 10.2395C20.8417 6.24765 16.84 3 11.9209 3C7.00219 3 3 6.24765 3 10.2395C3 13.818 6.17364 16.8152 10.4607 17.3817C10.7511 17.4445 11.1466 17.5733 11.2465 17.8217C11.3365 18.0471 11.3054 18.4005 11.2755 18.6282C11.2755 18.6282 11.1708 19.2578 11.148 19.392C11.1091 19.6173 10.9688 20.274 11.9209 19.873C12.8729 19.4717 17.0583 16.8477 18.9299 14.6937C20.2227 13.2758 20.8417 11.837 20.8417 10.2395Z" stroke-width="1.3" stroke-linejoin="round"/><path d="M15.7695 8.88233H17.643V8.71192H15.5989V12.143H17.643V11.9725H15.7695V10.5127H17.643V10.3422H15.7695V8.88233ZM6.49854 11.9725V8.71192H6.32812V12.143H8.37221V11.9725H6.49854ZM14.0175 12.0099L11.5754 8.71185H11.2922V12.143H11.4626V8.84573L13.9042 12.143H14.1879V8.71185H14.0175V12.0099ZM9.71054 8.71185V12.143H9.88096V8.71185H9.71054Z" stroke-width="0.892086" stroke-linejoin="round"/></g>`,
    width: 24,
    height: 24,
  },
  whatsapp: {
    body: `<path fill-rule="evenodd" clip-rule="evenodd" d="M18.5226 5.48219C16.9248 3.88232 14.7997 3.00081 12.5355 3C7.8698 3 4.07265 6.79675 4.07102 11.4636C4.07021 12.9555 4.46024 14.4117 5.20092 15.695L4.43204 18.5034C4.24004 19.2047 4.87929 19.8508 5.58261 19.6664L8.4871 18.9045C9.72331 19.5791 11.1154 19.9342 12.5318 19.9346H12.5355C17.2003 19.9346 20.9979 16.1374 20.9995 11.4705C21.0003 9.20874 20.1208 7.08206 18.5226 5.48219ZM12.5355 18.5052H12.5326C11.2704 18.5048 10.0322 18.1655 8.95182 17.5246L8.6949 17.372L6.0321 18.0705L6.74275 15.4742L6.57553 15.208C5.87138 14.0879 5.49922 12.7932 5.50003 11.4641C5.50165 7.58532 8.65755 4.42941 12.5383 4.42941C14.4174 4.43022 16.1837 5.16279 17.512 6.49276C18.8404 7.82234 19.5713 9.59024 19.5705 11.4697C19.5689 15.3489 16.413 18.5052 12.5355 18.5052ZM16.3943 13.2364C16.1828 13.1305 15.1431 12.6191 14.9491 12.5485C14.7551 12.4778 14.6143 12.4426 14.4734 12.6544C14.3326 12.8663 13.9271 13.3427 13.8038 13.4836C13.6804 13.6248 13.557 13.6423 13.3455 13.5363C13.1341 13.4304 12.4527 13.2072 11.6446 12.4868C11.016 11.9259 10.5914 11.2335 10.4681 11.0216C10.3447 10.8098 10.4551 10.6953 10.5606 10.5902C10.6555 10.4953 10.772 10.3431 10.878 10.2197C10.9839 10.0963 11.0188 10.0079 11.0894 9.867C11.1601 9.72576 11.1247 9.60242 11.072 9.49646C11.0192 9.39054 10.5963 8.34951 10.4198 7.92622C10.2481 7.51389 10.0736 7.56989 9.94411 7.56299C9.82073 7.5569 9.67991 7.55569 9.53868 7.55569C9.39744 7.55569 9.16851 7.60845 8.97453 7.82031C8.78055 8.03214 8.23425 8.54392 8.23425 9.58452C8.23425 10.6251 8.992 11.6313 9.09792 11.7725C9.20383 11.9137 10.5894 14.0497 12.7108 14.9661C13.2153 15.1841 13.6094 15.3144 13.9166 15.4118C14.4231 15.5729 14.8841 15.5502 15.2486 15.4958C15.6549 15.4349 16.4998 14.984 16.676 14.4901C16.8521 13.9961 16.8521 13.5724 16.7994 13.4844C16.7466 13.3963 16.6058 13.3423 16.3943 13.2364Z" fill="currentColor"/>`,
    width: 24,
    height: 24,
  },
  instagram: {
    body: `<g fill="none" stroke="currentColor"><path d="M12.0003 15.3329C13.8412 15.3329 15.3337 13.8405 15.3337 11.9996C15.3337 10.1586 13.8412 8.66626 12.0003 8.66626C10.1594 8.66626 8.66699 10.1586 8.66699 11.9996C8.66699 13.8405 10.1594 15.3329 12.0003 15.3329Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 15.3333V8.66667C4.5 6.36548 6.36548 4.5 8.66667 4.5H15.3333C17.6345 4.5 19.5 6.36548 19.5 8.66667V15.3333C19.5 17.6345 17.6345 19.5 15.3333 19.5H8.66667C6.36548 19.5 4.5 17.6345 4.5 15.3333Z" stroke-width="1.5"/><path d="M16.583 7.42552L16.5913 7.41626" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></g>`,
    width: 24,
    height: 24,
  },
  tiktok: {
    body: `<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.2 10.1c0 .22-.18.401-.4.39a8 8 0 0 1-3.362-.93c-.281-.15-.638.045-.638.364V15.5a6 6 0 1 1-6.4-5.987a.38.38 0 0 1 .4.387v2.8c0 .22-.18.397-.398.433A2.4 2.4 0 1 0 12.2 15.5V2.9a.4.4 0 0 1 .4-.4h2.8a.43.43 0 0 1 .418.4a4.4 4.4 0 0 0 3.983 3.982c.22.02.4.197.4.418z"/>`,
    width: 24,
    height: 24,
  },
  messenger: {
    body: `<g fill="none" stroke="currentColor"><path d="M17.6568 6.34316C14.5326 3.21895 9.46735 3.21895 6.34314 6.34316C3.63893 9.04737 3.27537 13.2059 5.25266 16.3012L4.7839 18.709C4.72531 19.0099 4.99007 19.2747 5.29104 19.2161L7.69882 18.7473C10.7941 20.7246 14.9526 20.3611 17.6568 17.6569C20.7811 14.5326 20.7811 9.46736 17.6568 6.34316Z" stroke-width="1.6" stroke-linejoin="round"/><path d="M15.8218 10.624L13.2228 13.2231L10.853 10.8534L8.25391 13.4524" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g>`,
    width: 24,
    height: 24,
  },
  telegram: {
    body: `<g fill="none" stroke="currentColor"><path d="M3.96668 10.6616C3.96668 10.6616 10.9417 7.80776 13.3608 6.80292C14.288 6.40099 17.4329 5.11474 17.4329 5.11474C17.4329 5.11474 18.8843 4.55212 18.7633 5.91861C18.7229 6.48134 18.4004 8.45083 18.0778 10.5811C17.5941 13.5957 17.0699 16.8916 17.0699 16.8916C17.0699 16.8916 16.9894 17.816 16.304 17.9768C15.6185 18.1376 14.4896 17.4141 14.288 17.2533C14.1268 17.1327 11.2643 15.324 10.216 14.4398C9.93378 14.1986 9.61123 13.7163 10.2563 13.1535C11.7077 11.8272 13.4414 10.1792 14.4896 9.13418C14.9734 8.6518 15.4573 7.52634 13.4414 8.89294C10.5789 10.8624 7.7566 12.7114 7.7566 12.7114C7.7566 12.7114 7.11161 13.1134 5.90208 12.7516C4.69255 12.3898 3.28141 11.9076 3.28141 11.9076C3.28141 11.9076 2.31387 11.3045 3.96689 10.6616H3.96668Z" stroke-width="1.5"/></g>`,
    width: 24,
    height: 24,
  },
  twilio: {
    body: `<g clip-path="url(#a)" fill="none"><circle cx="12.5" cy="11.5" r="8.55" stroke="currentColor" stroke-width="1.6"/><circle cx="10.5" cy="9.5" r="1.5" fill="currentColor"/><circle cx="14.5" cy="9.5" r="1.5" fill="currentColor"/><circle cx="14.5" cy="13.5" r="1.5" fill="currentColor"/><circle cx="10.5" cy="13.5" r="1.5" fill="currentColor"/></g><defs><clipPath id="a"><path fill="currentColor" d="M3 2h19v19H3z"/></clipPath></defs>`,
    width: 24,
    height: 24,
  },
  gmail: {
    body: `<path d="M20 6.25V16.75C20 17.3175 19.5675 17.75 19 17.75H18V8.1745L12 11.8095L6 8.1745V17.75H5C4.4325 17.75 4 17.3175 4 16.75V6.25C4 5.966 4.107 5.716 4.2865 5.539C4.466 5.3565 4.716 5.25 5 5.25H5.3335L12 9.3835L18.6665 5.25H19C19.284 5.25 19.534 5.357 19.7135 5.539C19.893 5.716 20 5.966 20 6.25Z" fill="currentColor"/>`,
    width: 24,
    height: 24,
  },
  outlook: {
    body: `<g fill="none"><path d="M7.875 8.4c.77 0 1.403.45 1.818 1.048.418.601.657 1.4.657 2.252 0 .853-.24 1.65-.657 2.251C9.278 14.55 8.644 15 7.875 15s-1.403-.45-1.818-1.049c-.418-.6-.657-1.398-.657-2.25s.24-1.652.657-2.253C6.472 8.85 7.106 8.4 7.875 8.4Z" stroke="currentColor" stroke-width="1.2"/><path d="M10.588 3.632a1.7 1.7 0 0 1 2.112 1.65v13.437a1.7 1.7 0 0 1-2.112 1.65l-5.243-1.311a2.7 2.7 0 0 1-2.045-2.62V7.563a2.7 2.7 0 0 1 2.045-2.62zM13 7h5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-5" stroke="currentColor" stroke-width="1.4"/><path d="M20.47 9.518a.7.7 0 0 0-.94-1.036L20 9zm-7.318 3.133-.495.495zM20 9l-.47-.518-4.09 3.717.471.518.471.518 4.089-3.717zm-6.848 3.652.495-.495-.652-.652L12.5 12l-.495.495.652.652zm2.76.065-.472-.518a1.3 1.3 0 0 1-1.793-.042l-.495.495-.495.495a2.7 2.7 0 0 0 3.725.088z" fill="currentColor"/></g>`,
    width: 24,
    height: 24,
  },
  x: {
    body: `<path d="M16.6007 4.99988H19.054L13.694 11.1265L20 19.4619H15.0627L11.196 14.4059L6.77067 19.4619H4.316L10.0493 12.9085L4 5.00054H9.06267L12.558 9.62188L16.6007 4.99988ZM15.74 17.9939H17.0993L8.324 6.39121H6.86533L15.74 17.9939Z" fill="currentColor"/>`,
    width: 24,
    height: 24,
  },
  'onboarding-greeting': {
    body: `<path d="M8.00008 14.0007C8.73646 14.0007 9.33341 13.4037 9.33341 12.6673C9.33341 11.9309 8.73646 11.334 8.00008 11.334C7.2637 11.334 6.66675 11.9309 6.66675 12.6673C6.66675 13.4037 7.2637 14.0007 8.00008 14.0007Z" fill="none" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.00008 4.66667C8.73646 4.66667 9.33341 4.06971 9.33341 3.33333C9.33341 2.59695 8.73646 2 8.00008 2C7.2637 2 6.66675 2.59695 6.66675 3.33333C6.66675 4.06971 7.2637 4.66667 8.00008 4.66667Z" fill="none" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.6666 9.33268C11.403 9.33268 11.9999 8.73573 11.9999 7.99935C11.9999 7.26297 11.403 6.66602 10.6666 6.66602C9.93021 6.66602 9.33325 7.26297 9.33325 7.99935C9.33325 8.73573 9.93021 9.33268 10.6666 9.33268Z" fill="none" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.3333 14.0007C14.0697 14.0007 14.6667 13.4037 14.6667 12.6673C14.6667 11.9309 14.0697 11.334 13.3333 11.334C12.597 11.334 12 11.9309 12 12.6673C12 13.4037 12.597 14.0007 13.3333 14.0007Z" fill="none" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.66659 14.0007C3.40297 14.0007 3.99992 13.4037 3.99992 12.6673C3.99992 11.9309 3.40297 11.334 2.66659 11.334C1.93021 11.334 1.33325 11.9309 1.33325 12.6673C1.33325 13.4037 1.93021 14.0007 2.66659 14.0007Z" fill="none" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.33333 9.33268C6.06971 9.33268 6.66667 8.73573 6.66667 7.99935C6.66667 7.26297 6.06971 6.66602 5.33333 6.66602C4.59695 6.66602 4 7.26297 4 7.99935C4 8.73573 4.59695 9.33268 5.33333 9.33268Z" fill="none" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>`,
    width: 16,
    height: 16,
  },
  plausible: {
    body: `<linearGradient id="SVGcy95AgrO" x1="189.056" x2="296.848" y1="470.428" y2="659.063" gradientTransform="translate(0 -278.024)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#909cf7"/><stop offset="1" stop-color="#4b38d8"/></linearGradient><path fill="url(#SVGcy95AgrO)" d="M448.6 192.9c-9.3 89.2-87.3 155.5-177 155.5H237v81.7c0 45.2-36.7 81.9-81.9 81.9h-64c-15.8 0-28.7-12.8-28.7-28.7V315.2l43-60.3c7.8-10.9 22.1-15 34.4-9.8l24.5 10.2c12.3 5.2 26.6 1.1 34.3-9.8l57.3-80.4c7.7-10.9 22-14.9 34.3-9.7l47.1 19.8c12.3 5.2 26.6 1.1 34.3-9.8l55.1-77.3c17.4 30.4 25.9 66.5 21.9 104.8"/><linearGradient id="SVGjYVYSdaH" x1="130.554" x2="241.634" y1="266.456" y2="460.846" gradientTransform="translate(0 -278.024)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#909cf7"/><stop offset="1" stop-color="#4b38d8"/></linearGradient><path fill="url(#SVGjYVYSdaH)" d="M90.6 246.4c7-9.9 17.2-17.4 29.1-19.7c9.3-1.8 18.4-.8 26.9 2.7l24.4 10.2c1.4.6 2.9.9 4.4.9c3.7 0 7.2-1.8 9.4-4.8l56.3-78.9c7-9.8 17.2-17.4 29.1-19.7c9.2-1.8 18.3-.8 26.7 2.7l47.1 19.8c1.4.6 2.9.9 4.4.9c3.7 0 7.2-1.8 9.4-4.8l59-82.8C385.3 28.7 333.7 0 275.3 0H91.1C75.3 0 62.5 12.8 62.5 28.7v257.1z"/>`,
    width: 512,
    height: 512,
  },
  'microsoft-clarity': {
    body: `<path fill="#50B5F0" d="M24 5 6 42 24 34Z"/><path fill="#2178C9" d="M24 5 24 34 42 42Z"/><path fill="#14548F" d="M6 42 24 34 42 42Z"/>`,
    width: 48,
    height: 48,
  },
};
