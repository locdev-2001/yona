import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Không bật vitest globals nên testing-library không tự cleanup → tự gỡ DOM
// sau mỗi test (id trùng giữa các test làm querySelector bắt nhầm).
afterEach(cleanup);
