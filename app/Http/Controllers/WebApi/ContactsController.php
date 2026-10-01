<?php

namespace App\Http\Controllers\WebApi;

use App\Builders\ContactInboxBuilder;
use App\Exceptions\CustomFilterException;
use App\Http\Controllers\Controller;
use App\Http\Resources\ContactResource;
use App\Jobs\Account\ContactsExportJob;
use App\Jobs\Avatar\AvatarFromUrlJob;
use App\Models\Account;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\Contacts\FilterService;
use App\Services\DataImports\ContactsImportService;
use App\Services\ProductEvents\ProductEventName;
use App\Services\ProductEvents\ProductEventRecorder;
use App\Support\OnlineStatusTracker;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

// Còn thiếu: contactable_inboxes (dùng cho New conversation — B3).
class ContactsController extends Controller
{
    public const RESULTS_PER_PAGE = 15;

    public const ATTACHMENT_RESULTS_PER_PAGE = 100;

    // Bảng sort_on của Sift: tham số sort → cột/scope tương ứng.
    private const SORT_SCOPES = [
        'email' => null,
        'phone_number' => null,
        'name' => 'orderOnName',
        'last_activity_at' => 'orderOnLastActivityAt',
        'created_at' => 'orderOnCreatedAt',
        'company_name' => 'orderOnCompanyName',
        'city' => 'orderOnCity',
        'country' => 'orderOnCountryName',
    ];

    public function index(Request $request, Account $account): JsonResponse
    {
        $query = Contact::query()
            ->where('account_id', $account->id)
            ->resolvedContacts(useCrmV2: $account->featureEnabled('crm_v2'));

        // resolved_contacts.tagged_with(params[:labels], any: true)
        $labels = array_filter((array) $request->query('labels', []));

        if ($labels !== []) {
            $query->whereHas('labels', fn (Builder $builder) => $builder->whereIn('title', $labels));
        }

        return $this->paginatedContacts($request, $query);
    }

    // Port từ Contacts::AttachmentsController#index — tệp đã chia sẻ trong mọi
    // hội thoại của liên hệ, mới nhất trước.
    public function attachments(Request $request, Account $account, int $contactId): JsonResponse
    {
        $contact = $this->fetchContact($account, $contactId);

        $conversationIds = Conversation::query()
            ->where('account_id', $account->id)
            ->where('contact_id', $contact->id)
            ->pluck('display_id', 'id');

        $attachments = Attachment::query()
            ->whereMorphedTo('attachable', Message::class)
            ->whereIn('attachable_id', Message::query()->select('id')->whereIn('conversation_id', $conversationIds->keys()))
            ->excludingStickers()
            ->with('attachable')
            ->orderByDesc('created_at')
            ->paginate(self::ATTACHMENT_RESULTS_PER_PAGE, ['*'], 'page', (int) $request->query('page', '1'));

        return response()->json([
            'meta' => ['total_count' => $attachments->total()],
            'payload' => collect($attachments->items())
                ->map(fn (Attachment $attachment) => [
                    ...$attachment->apiData(),
                    'conversation_id' => $conversationIds[$attachment->attachable?->conversation_id] ?? null,
                ])
                ->values()
                ->all(),
        ]);
    }

    // contacts#import: tạo một DataImport kèm tệp CSV rồi xếp job nhập.
    public function import(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $file = $request->file('import_file');

        if (! $file instanceof UploadedFile) {
            return response()->json(['error' => __('errors.contacts.import.failed')], 422);
        }

        (new ContactsImportService)->perform($account, $request->user(), $file);

        return response()->json(null, 200);
    }

    // contacts#export: sinh CSV nền rồi gửi liên kết tải về qua email.
    public function export(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        ContactsExportJob::dispatch(
            $account->id,
            $request->user()->id,
            $request->input('column_names'),
            ['payload' => $request->input('payload'), 'label' => $request->input('label')],
        );

        app(ProductEventRecorder::class)->record(
            ProductEventName::ContactsExported,
            $account,
            ['filtered' => filled($request->input('payload')) || filled($request->input('label'))],
        );

        return response()->json(null, 200);
    }

    // contacts#filter: segment liên hệ — cùng lõi lọc với hội thoại.
    public function filter(Request $request, Account $account): JsonResponse
    {
        $validated = $request->validate([
            'payload' => ['required', 'array', 'min:1', 'max:20'],
            'payload.*' => ['required', 'array'],
        ]);

        try {
            $contacts = (new FilterService($account, $validated['payload']))->perform();
        } catch (CustomFilterException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return $this->paginatedContacts($request, $contacts);
    }

    public function search(Request $request, Account $account): JsonResponse
    {
        $searchTerm = trim((string) $request->query('q'));

        if ($searchTerm === '') {
            return response()->json(['error' => 'Specify search string with parameter q'], 422);
        }

        $like = '%'.$searchTerm.'%';
        $query = Contact::query()->where('account_id', $account->id)->where(function (Builder $builder) use ($like) {
            $builder->where('name', 'ILIKE', $like)
                ->orWhere('email', 'ILIKE', $like)
                ->orWhere('phone_number', 'ILIKE', $like)
                // identifier so khớp LIKE (phân biệt hoa thường) — đúng bản gốc.
                ->orWhere('contacts.identifier', 'LIKE', $like);
        });

        // fetch_contacts_with_has_more: lấy dư 1 bản ghi để biết còn trang sau.
        $offset = ($this->currentPage($request) - 1) * self::RESULTS_PER_PAGE;
        $results = $this->applySort($request, $query)
            ->with($this->eagerLoads($request))
            ->offset($offset)
            ->limit(self::RESULTS_PER_PAGE + 1)
            ->get();

        $hasMore = $results->count() > self::RESULTS_PER_PAGE;
        $results = $results->take(self::RESULTS_PER_PAGE);

        return response()->json([
            'meta' => [
                'count' => $results->count(),
                'current_page' => $this->currentPage($request),
                'has_more' => $hasMore,
            ],
            'payload' => ContactResource::collectionFor($results, $this->includeContactInboxes($request)),
        ]);
    }

    // Contact đang online theo presence tracker (không lọc resolved như index).
    public function active(Request $request, Account $account): JsonResponse
    {
        $query = Contact::query()
            ->where('account_id', $account->id)
            ->whereIn('id', OnlineStatusTracker::getAvailableContactIds($account->id));

        return $this->paginatedContacts($request, $query);
    }

    public function show(Request $request, Account $account, int $contactId): JsonResponse
    {
        return response()->json([
            'payload' => $this->contactPayload($request, $this->fetchContact($account, $contactId)),
        ]);
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $data = $this->validateContactPayload($request, $account);

        [$contact, $contactInbox] = DB::transaction(function () use ($request, $account, $data) {
            $contact = $account->contacts()->create(collect($data)->except(['avatar', 'avatar_url'])->all());

            if ($request->file('avatar') instanceof UploadedFile) {
                $contact->replaceAvatar($request->file('avatar'));
            }

            return [$contact, $this->buildContactInbox($request, $account, $contact)];
        });

        $this->processAvatarFromUrl($request, $contact);

        return response()->json([
            'payload' => [
                'contact' => (new ContactResource($contact, withContactInboxes: true))->toArray($request),
                'contact_inbox' => [
                    'inbox' => $contactInbox?->inbox?->toArray(),
                    'source_id' => $contactInbox?->source_id,
                ],
            ],
        ]);
    }

    public function update(Request $request, Account $account, int $contactId): JsonResponse
    {
        $contact = $this->fetchContact($account, $contactId);
        $data = $this->validateContactPayload($request, $account, $contact);

        // contact_update_params: custom/additional_attributes MERGE vào giá trị cũ.
        $attributes = collect($data)->except(['avatar', 'avatar_url', 'custom_attributes', 'additional_attributes'])->all();

        if (array_key_exists('custom_attributes', $data)) {
            $attributes['custom_attributes'] = [...($contact->custom_attributes ?? []), ...$data['custom_attributes']];
        }

        if (array_key_exists('additional_attributes', $data)) {
            $attributes['additional_attributes'] = [...($contact->additional_attributes ?? []), ...$data['additional_attributes']];
        }

        $contact->update($attributes);

        if ($request->file('avatar') instanceof UploadedFile) {
            $contact->replaceAvatar($request->file('avatar'));
        }

        $this->processAvatarFromUrl($request, $contact);

        return response()->json([
            'payload' => $this->contactPayload($request, $contact->refresh()),
        ]);
    }

    public function destroy(Request $request, Account $account, int $contactId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $contact = $this->fetchContact($account, $contactId);

        if (OnlineStatusTracker::getPresence($account->id, 'Contact', $contact->id)) {
            // Ruby String#capitalize: ký tự đầu hoa, phần còn lại thường.
            return response()->json([
                'message' => __('contacts.online.delete', ['contact_name' => ucfirst(mb_strtolower((string) $contact->name))]),
            ], 422);
        }

        $contact->delete();

        return response()->json(null, 200);
    }

    public function destroyCustomAttributes(Request $request, Account $account, int $contactId): JsonResponse
    {
        $contact = $this->fetchContact($account, $contactId);

        $removedKeys = (array) $request->input('custom_attributes', []);
        $contact->custom_attributes = collect($contact->custom_attributes ?? [])
            ->except($removedKeys)
            ->all();
        $contact->save();

        // jbuilder destroy_custom_attributes luôn kèm contact_inboxes.
        return response()->json([
            'payload' => (new ContactResource($contact, withContactInboxes: true))->toArray($request),
        ]);
    }

    public function destroyAvatar(Request $request, Account $account, int $contactId): JsonResponse
    {
        $contact = $this->fetchContact($account, $contactId);
        $contact->removeAvatar();

        // avatar.json.jbuilder: payload là liên hệ không kèm contact_inboxes.
        return response()->json([
            'payload' => (new ContactResource($contact))->toArray($request),
        ]);
    }

    // fetch_contacts: eager load + phân trang, meta {count, current_page}.
    /** @param Builder<Contact> $query */
    private function paginatedContacts(Request $request, Builder $query): JsonResponse
    {
        $paginated = $this->applySort($request, $query)
            ->with($this->eagerLoads($request))
            ->paginate(self::RESULTS_PER_PAGE, ['*'], 'page', $this->currentPage($request));

        return response()->json([
            'meta' => [
                'count' => $paginated->total(),
                'current_page' => $this->currentPage($request),
            ],
            'payload' => ContactResource::collectionFor($paginated->items(), $this->includeContactInboxes($request)),
        ]);
    }

    private function fetchContact(Account $account, int $contactId): Contact
    {
        return $account->contacts()->findOrFail($contactId);
    }

    private function contactPayload(Request $request, Contact $contact): array
    {
        return (new ContactResource($contact, $this->includeContactInboxes($request)))->toArray($request);
    }

    private function includeContactInboxes(Request $request): bool
    {
        $param = $request->query('include_contact_inboxes');

        return $param === null ? true : $param === 'true';
    }

    private function eagerLoads(Request $request): array
    {
        return $this->includeContactInboxes($request)
            ? ['avatar', 'account', 'contactInboxes.inbox.channel', 'contactInboxes.inbox.avatar']
            : ['avatar', 'account'];
    }

    private function currentPage(Request $request): int
    {
        return max(1, (int) $request->query('page', '1'));
    }

    private function applySort(Request $request, Builder $query): Builder
    {
        $sortParam = (string) $request->query('sort', '');

        if ($sortParam === '') {
            return $query;
        }

        $direction = str_starts_with($sortParam, '-') ? 'desc' : 'asc';
        $field = ltrim($sortParam, '-');

        if (! array_key_exists($field, self::SORT_SCOPES)) {
            return $query;
        }

        $scope = self::SORT_SCOPES[$field];

        return $scope === null
            ? $query->orderBy($field, $direction)
            : $query->{$scope}($direction);
    }

    private function buildContactInbox(Request $request, Account $account, Contact $contact): ?ContactInbox
    {
        if (blank($request->input('inbox_id'))) {
            return null;
        }

        $inbox = $account->inboxes()->findOrFail((int) $request->input('inbox_id'));

        return (new ContactInboxBuilder(
            contact: $contact,
            inbox: $inbox,
            sourceId: $request->input('source_id'),
        ))->perform();
    }

    private function processAvatarFromUrl(Request $request, Contact $contact): void
    {
        if (filled($request->input('avatar_url'))) {
            AvatarFromUrlJob::dispatch($contact, $request->input('avatar_url'));
        }
    }

    // Validation shape của payload; luật nghiệp vụ (định dạng + trùng) do
    // Contact::validationErrors() quyết định — 422 giữ shape render_record_invalid:
    // {message: các thông báo nối ', ', attributes: [tên thuộc tính]}.
    private function validateContactPayload(Request $request, Account $account, ?Contact $contact = null): array
    {
        $payload = $request->only([
            'name', 'identifier', 'email', 'phone_number', 'blocked',
            'additional_attributes', 'custom_attributes',
        ]);

        $data = Validator::make($payload, [
            'name' => ['sometimes', 'nullable', 'string'],
            'email' => ['sometimes', 'nullable', 'string'],
            'phone_number' => ['sometimes', 'nullable', 'string'],
            'identifier' => ['sometimes', 'nullable', 'string'],
            'blocked' => ['sometimes', 'boolean'],
            'additional_attributes' => ['sometimes', 'array'],
            'custom_attributes' => ['sometimes', 'array'],
        ])->validate();

        $candidate = $contact ? clone $contact : new Contact(['account_id' => $account->id]);
        $candidate->account_id = $account->id;
        $candidate->fill(collect($data)->except(['blocked', 'additional_attributes', 'custom_attributes'])->all());

        $errors = $candidate->validationErrors();

        if ($errors !== []) {
            abort(response()->json([
                'message' => collect($errors)->flatten()->implode(', '),
                'attributes' => array_keys($errors),
            ], 422));
        }

        if (array_key_exists('blocked', $data)) {
            $data['blocked'] = filter_var($data['blocked'], FILTER_VALIDATE_BOOLEAN);
        }

        return $data;
    }
}
