<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\MessageResource;
use App\Http\Resources\Search\SearchContactResource;
use App\Http\Resources\Search\SearchConversationResource;
use App\Http\Resources\Search\SearchFileResource;
use App\Models\Account;
use App\Services\SearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Port từ Api::V1::Accounts::SearchController + các jbuilder trong
// api/v1/accounts/search/.
class SearchController extends Controller
{
    public function index(Request $request, Account $account): JsonResponse
    {
        $result = $this->search($request, $account, 'all');

        return $this->payload([
            'conversations' => SearchConversationResource::collectionFor($result['conversations']),
            'contacts' => SearchContactResource::collectionFor($result['contacts']),
            'messages' => MessageResource::collectionFor($result['messages']),
            'files' => SearchFileResource::collectionFor($result['files']),
            'articles' => $result['articles'],
        ]);
    }

    public function conversations(Request $request, Account $account): JsonResponse
    {
        $result = $this->search($request, $account, 'Conversation');

        return $this->payload([
            'conversations' => SearchConversationResource::collectionFor($result['conversations'], withAdditionalAttributes: true),
        ]);
    }

    public function contacts(Request $request, Account $account): JsonResponse
    {
        $result = $this->search($request, $account, 'Contact');

        return $this->payload(['contacts' => SearchContactResource::collectionFor($result['contacts'])]);
    }

    public function messages(Request $request, Account $account): JsonResponse
    {
        $result = $this->search($request, $account, 'Message');

        return $this->payload(['messages' => MessageResource::collectionFor($result['messages'])]);
    }

    public function files(Request $request, Account $account): JsonResponse
    {
        $result = $this->search($request, $account, 'Attachment');

        return $this->payload(['files' => SearchFileResource::collectionFor($result['files'])]);
    }

    public function articles(Request $request, Account $account): JsonResponse
    {
        $result = $this->search($request, $account, 'Article');

        return $this->payload(['articles' => $result['articles']]);
    }

    /** @return array<string, mixed> */
    private function search(Request $request, Account $account, string $searchType): array
    {
        return (new SearchService($request->user(), $account, $request->query(), $searchType))->perform();
    }

    /** @param array<string, mixed> $payload */
    private function payload(array $payload): JsonResponse
    {
        return response()->json(['payload' => $payload]);
    }
}
