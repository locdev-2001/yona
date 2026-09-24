<?php

namespace App\Http\Controllers\Widget;

use App\Actions\ContactIdentifyAction;
use App\Builders\ContactInboxWithContactBuilder;
use App\Http\Middleware\ResolveWidgetChannel;
use App\Http\Resources\Widget\WidgetContactResource;
use App\Models\Channel\WebWidget;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Support\WidgetTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// (+ WidgetHelper#build_contact_inbox_with_token).
class ContactsController extends WidgetController
{
    private const IDENTITY_KEYS = ['identifier', 'email', 'name', 'avatar_url', 'phone_number'];

    public function show(Request $request): JsonResponse
    {
        return response()->json(WidgetContactResource::show($this->contact($request)));
    }

    public function update(Request $request): JsonResponse
    {
        // Pre-chat ẩn danh (không gửi identifier) vẫn cập nhật được trên inbox
        // bắt buộc HMAC; chỉ đường GẮN ĐỊNH DANH mới cần chữ ký.
        if (filled($request->input('identifier'))) {
            $unauthorized = $this->rejectInvalidHmac($request);

            if ($unauthorized !== null) {
                return $unauthorized;
            }
        }

        return response()->json(WidgetContactResource::identityFlags($this->identifyContact($request, $this->contact($request))));
    }

    public function setUser(Request $request): JsonResponse
    {
        $unauthorized = $this->rejectInvalidHmac($request);

        if ($unauthorized !== null) {
            return $unauthorized;
        }

        $channel = $this->channel($request);
        $widgetAuthToken = null;
        $contact = $this->contact($request);

        // a_different_contact?: khách đăng nhập bằng một danh tính khác trên
        // cùng trình duyệt → cấp phiên mới thay vì ghi đè hồ sơ đang mở.
        if ($this->isDifferentContact($request, $contact)) {
            [$contactInbox, $widgetAuthToken] = $this->buildContactInboxWithToken($request, $channel);
            $request->attributes->set(ResolveWidgetChannel::CONTACT_INBOX, $contactInbox);
            $contact = $contactInbox->contact;
        }

        if ($this->shouldVerifyHmac($request)) {
            $this->contactInbox($request)->update(['hmac_verified' => true]);
        }

        return response()->json(
            WidgetContactResource::setUser($this->identifyContact($request, $contact), $widgetAuthToken)
        );
    }

    public function destroyCustomAttributes(Request $request): JsonResponse
    {
        $contact = $this->contact($request);
        $removed = (array) $request->input('custom_attributes', []);

        $contact->update([
            'custom_attributes' => collect($contact->custom_attributes ?? [])
                ->reject(fn ($value, $key) => in_array($key, $removed, true))
                ->all(),
        ]);

        return response()->json($contact->fresh()->attributesToArray());
    }

    private function identifyContact(Request $request, Contact $contact): Contact
    {
        return (new ContactIdentifyAction(
            contact: $contact,
            params: [
                ...$request->only(self::IDENTITY_KEYS),
                'custom_attributes' => $request->input('custom_attributes'),
                'additional_attributes' => $request->input('additional_attributes'),
            ],
            discardInvalidAttrs: true,
        ))->perform();
    }

    /** @return array{0: ContactInbox, 1: string} */
    private function buildContactInboxWithToken(Request $request, WebWidget $channel): array
    {
        $contactInbox = (new ContactInboxWithContactBuilder(
            inbox: $channel->inbox,
            contactAttributes: [],
        ))->perform();

        abort_if($contactInbox === null, 422, 'Could not create a contact for this widget');

        return [$contactInbox, WidgetTokenService::generate([
            'source_id' => $contactInbox->source_id,
            'inbox_id' => $channel->inbox->id,
        ])];
    }

    private function isDifferentContact(Request $request, Contact $contact): bool
    {
        return filled($contact->identifier) && $contact->identifier !== $request->input('identifier');
    }

    private function rejectInvalidHmac(Request $request): ?JsonResponse
    {
        if (! $this->shouldVerifyHmac($request) || $this->hasValidHmac($request)) {
            return null;
        }

        return response()->json(['error' => 'HMAC failed: Invalid Identifier Hash Provided'], 401);
    }

    private function shouldVerifyHmac(Request $request): bool
    {
        if (blank($request->input('identifier_hash')) && ! $this->channel($request)->hmac_mandatory) {
            return false;
        }

        // Chỉ đổi custom_attributes (không kèm identifier) không phải hành vi
        // gắn định danh — không đòi chữ ký.
        return ! (filled($request->input('custom_attributes')) && blank($request->input('identifier')));
    }

    private function hasValidHmac(Request $request): bool
    {
        $expected = hash_hmac('sha256', (string) $request->input('identifier'), (string) $this->channel($request)->hmac_token);

        return hash_equals($expected, (string) $request->input('identifier_hash'));
    }
}
