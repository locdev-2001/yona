<?php

namespace App\Http\Controllers;

use App\Services\Marketing\DemoRequestIntake;
use App\Support\LandingPayload;
use App\Support\PhoneNumber;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Trang đặt lịch demo: kênh thu lead duy nhất chạy được khi luồng tự đăng ký
 * còn chặn.
 *
 * Form gửi kiểu native (POST rồi redirect), không fetch: không có state form
 * trong React, không có lớp xử lý lỗi mạng ở client, và tắt JS vẫn gửi được.
 */
class DemoRequestsController extends Controller
{
    public function create(): View
    {
        return view('landing', ['landingConfig' => $this->payload()]);
    }

    public function store(Request $request, DemoRequestIntake $intake): RedirectResponse
    {
        // Bẫy bot: ô `website` ẩn khỏi mắt và khỏi trình đọc màn hình, người
        // thật không bao giờ điền. Điền thì coi như đã nhận, không tạo gì cả —
        // báo lỗi chỉ dạy bot cách lách.
        if (filled($request->input('website'))) {
            Log::info('demo_request.honeypot', ['ip' => $request->ip()]);

            return redirect()->route('demo_request.thanks');
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:30'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $phone = PhoneNumber::normalize($data['phone']);

        if ($phone === null) {
            return back()->withInput()->withErrors(['phone' => trans('landing.demo.form.phone_invalid')]);
        }

        try {
            $intake->record(
                name: $data['name'],
                phoneE164: $phone,
                note: $data['note'] ?? null,
                sourcePage: $request->path(),
            );
        } catch (Throwable $exception) {
            // KHÔNG ghi tên hay số điện thoại vào log: Nghị định 13 coi đó là dữ
            // liệu cá nhân, mà log đi qua nhiều tay hơn cơ sở dữ liệu.
            // KHÔNG ghi `getMessage()` thô. `contact_inboxes` có
            // `unique(inbox_id, source_id)` và `source_id` của lead là số điện
            // thoại, nên một lần đụng unique là Postgres trả về message chứa
            // nguyên giá trị đó — số khách rơi thẳng vào log (Nghị định 13).
            // Lớp exception + tệp:dòng đủ để lần ra chỗ hỏng.
            Log::error('demo_request.intake_failed', [
                'ip' => $request->ip(),
                'exception' => $exception::class,
                'at' => basename($exception->getFile()).':'.$exception->getLine(),
            ]);

            // Không hiện trang cảm ơn khi chưa nhận được gì. Khách quay lại form
            // với dữ liệu còn nguyên, kèm hotline và Zalo để đi đường khác.
            return back()->withInput()->with('demo_request_failed', true);
        }

        return redirect()->route('demo_request.thanks');
    }

    public function thanks(): View
    {
        return view('landing', [
            'landingConfig' => LandingPayload::make('demo_thanks', [
                'meta' => trans('landing.demo.thanks.meta'),
            ]),
        ]);
    }

    /** @return array<string, mixed> */
    private function payload(): array
    {
        return LandingPayload::make('demo', [
            'meta' => trans('landing.demo.meta'),
            'form' => [
                'action' => route('demo_request.store'),
                'csrf' => csrf_token(),
                'errors' => session('errors')?->getBag('default')->messages() ?? [],
                'old' => [
                    'name' => (string) old('name', ''),
                    'phone' => (string) old('phone', ''),
                    'note' => (string) old('note', ''),
                ],
                'failed' => (bool) session('demo_request_failed'),
            ],
        ]);
    }
}
