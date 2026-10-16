<?php

namespace App\Agent\Boundary\Evals;

use App\Agent\Evals\EvalShop;
use App\Agent\Evals\ShopFixture;
use App\Builders\AccountBuilder;
use App\Messaging\Structured\PayloadContext;
use App\Messaging\Structured\StructuredTypeRegistry;
use App\Models\Account;
use App\Models\AiAgent;
use App\Models\Article;
use App\Models\CannedResponse;
use App\Models\Channel\WebWidget;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\PaymentAccount;
use App\Models\Portal;
use App\Models\User;
use App\Services\AiAgents\AiAgentService;
use Illuminate\Contracts\Validation\Factory as ValidationFactory;
use Illuminate\Database\ConnectionInterface;
use InvalidArgumentException;
use RuntimeException;

// Dựng shop mẫu của bộ chấm vào lõi, chạy lại bao nhiêu lần cũng ra cùng một shop: account
// nhận ra bằng dấu trong custom_attributes, mọi thứ khác khớp theo khoá tự nhiên (tên inbox,
// tên AI, short_code, slug, số tài khoản). Kho kiến thức đồng bộ đúng theo tệp: mục không
// còn trong tệp thì xoá. Hội thoại eval không bị đụng tới.
final class EvalShopSeeder
{
    private const CARD_CONTENT_TYPE = 'cards';

    public function __construct(
        private readonly ConnectionInterface $connection,
        private readonly AiAgentService $aiAgents,
        private readonly StructuredTypeRegistry $structuredTypes,
        private readonly ValidationFactory $validator,
    ) {}

    public function find(ShopFixture $fixture): ?EvalShop
    {
        $account = $this->account($fixture);
        $admin = User::query()->where('email', $fixture->admin['email'])->first();
        $inbox = $account === null ? null : $this->inbox($account, $fixture);
        $aiAgentId = $inbox?->ai_agent_id;

        return $account === null || $admin === null || $inbox === null || $aiAgentId === null
            ? null
            : new EvalShop($account->id, $inbox->id, (int) $aiAgentId, $admin->id);
    }

    public function seed(ShopFixture $fixture): EvalShop
    {
        return $this->connection->transaction(function () use ($fixture) {
            [$account, $admin] = $this->ensureAccount($fixture);
            $inbox = $this->ensureInbox($account, $fixture);
            $aiAgent = $this->ensureAiAgent($account, $inbox, $fixture);

            $this->syncCannedResponses($account, $fixture);
            $this->syncHelpCenter($account, $admin, $fixture);
            $this->ensurePaymentAccount($account, $fixture);

            return new EvalShop($account->id, $inbox->id, $aiAgent->id, $admin->id);
        });
    }

    private function account(ShopFixture $fixture): ?Account
    {
        return Account::query()->where("custom_attributes->{$fixture->marker}", true)->orderBy('id')->first();
    }

    /** @return array{0: Account, 1: User} */
    private function ensureAccount(ShopFixture $fixture): array
    {
        $account = $this->account($fixture);
        $admin = User::query()->where('email', $fixture->admin['email'])->first();

        if ($admin !== null && $admin->accounts()->where('accounts.id', '!=', $account?->id ?? 0)->exists()) {
            throw new RuntimeException("{$fixture->admin['email']} belongs to an account that is not the eval shop; refusing to touch it.");
        }

        if ($account === null) {
            [$admin, $account] = (new AccountBuilder(
                accountName: $fixture->account['name'],
                email: $fixture->admin['email'],
                userFullName: $fixture->admin['name'],
                userPassword: $fixture->admin['password'],
                confirmed: true,
                user: $admin,
                locale: $fixture->account['locale'],
            ))->perform();

            $account->custom_attributes = [...($account->custom_attributes ?? []), $fixture->marker => true];
            $account->finishOnboarding();
        }

        if ($admin === null) {
            throw new RuntimeException("Eval shop account #{$account->id} exists but its admin {$fixture->admin['email']} is gone.");
        }

        $account->update(['name' => $fixture->account['name'], 'locale' => $fixture->account['locale']]);

        return [$account, $admin];
    }

    private function inbox(Account $account, ShopFixture $fixture): ?Inbox
    {
        return Inbox::query()
            ->where('account_id', $account->id)
            ->where('channel_type', (new WebWidget)->getMorphClass())
            ->where('name', $fixture->inbox['name'])
            ->orderBy('id')
            ->first();
    }

    // Tắt tự phân công và xin email để hội thoại eval chỉ có tin của khách và AI.
    private function ensureInbox(Account $account, ShopFixture $fixture): Inbox
    {
        $inbox = $this->inbox($account, $fixture);

        if ($inbox === null) {
            $channel = WebWidget::query()->create(['account_id' => $account->id, 'website_url' => $fixture->inbox['website_url']]);
            $inbox = $account->inboxes()->create([
                'name' => $fixture->inbox['name'],
                'channel_id' => $channel->getKey(),
                'channel_type' => $channel->getMorphClass(),
            ]);
        }

        $inbox->update([
            'enable_auto_assignment' => false,
            'enable_email_collect' => false,
            'greeting_enabled' => false,
            'working_hours_enabled' => false,
            'csat_survey_enabled' => false,
            'timezone' => $fixture->account['timezone'],
        ]);

        return $inbox;
    }

    private function ensureAiAgent(Account $account, Inbox $inbox, ShopFixture $fixture): AiAgent
    {
        $profile = $fixture->aiAgent;
        $aiAgent = AiAgent::query()->where('account_id', $account->id)->where('name', $profile['name'])->orderBy('id')->first();

        $aiAgent = $aiAgent === null
            ? $this->aiAgents->create($account, $profile['name'], $profile['persona'], $profile['instructions'])
            : $this->aiAgents->update($aiAgent, ['persona' => $profile['persona'], 'instructions' => $profile['instructions'], 'enabled' => true]);

        if ($inbox->ai_agent_id !== $aiAgent->id) {
            $this->aiAgents->assignInbox($inbox, $aiAgent);
        }

        return $aiAgent;
    }

    private function syncCannedResponses(Account $account, ShopFixture $fixture): void
    {
        $wanted = [];

        foreach ($fixture->cannedResponses as $snippet) {
            $wanted[$snippet['short_code']] = ['content' => $snippet['content'], 'content_type' => null, 'content_attributes' => null];
        }

        foreach ($fixture->products as $product) {
            $wanted[$product['short_code']] = [
                'content' => $product['content'],
                'content_type' => self::CARD_CONTENT_TYPE,
                'content_attributes' => $this->cardAttributes($account, $product['content'], ['items' => [$product['card']]]),
            ];
        }

        CannedResponse::query()->where('account_id', $account->id)->whereNotIn('short_code', array_keys($wanted))->delete();

        foreach ($wanted as $shortCode => $attributes) {
            CannedResponse::query()->updateOrCreate(['account_id' => $account->id, 'short_code' => $shortCode], $attributes);
        }
    }

    /**
     * Cùng luật với câu trả lời mẫu dạng thẻ tạo từ giao diện: kiểm bằng rules() của loại
     * thẻ rồi chuẩn hoá bằng normalize().
     *
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function cardAttributes(Account $account, string $content, array $attributes): array
    {
        $type = $this->structuredTypes->for(self::CARD_CONTENT_TYPE) ?? throw new RuntimeException('The cards content type is not registered.');
        $validation = $this->validator->make([...$attributes, 'content' => $content], $type->rules());

        if ($validation->fails()) {
            throw new InvalidArgumentException('Invalid product card: '.$validation->errors()->first());
        }

        return $type->normalize($attributes, new PayloadContext(new Conversation(['account_id' => $account->id]), Message::TYPE_OUTGOING));
    }

    private function syncHelpCenter(Account $account, User $admin, ShopFixture $fixture): void
    {
        $locale = $fixture->account['locale'];
        $portal = Portal::query()->updateOrCreate(
            ['account_id' => $account->id, 'slug' => $fixture->portal['slug']],
            ['name' => $fixture->portal['name'], 'config' => ['allowed_locales' => [$locale], 'default_locale' => $locale], 'archived' => false],
        );
        $slugs = array_column($fixture->articles, 'slug');

        Article::query()->where('portal_id', $portal->id)->whereNotIn('slug', $slugs)->delete();

        foreach ($fixture->articles as $article) {
            Article::query()->updateOrCreate(
                ['portal_id' => $portal->id, 'slug' => $article['slug']],
                [
                    'account_id' => $account->id,
                    'author_id' => $admin->id,
                    'title' => $article['title'],
                    'description' => $article['description'],
                    'content' => $article['content'],
                    'locale' => $locale,
                    'status' => 'published',
                ],
            );
        }
    }

    private function ensurePaymentAccount(Account $account, ShopFixture $fixture): void
    {
        $details = $fixture->paymentAccount;
        $paymentAccount = PaymentAccount::query()->updateOrCreate(
            ['account_id' => $account->id, 'account_number' => $details['account_number']],
            [
                'bank_bin' => $details['bank_bin'],
                'bank_code' => $details['bank_code'],
                'account_name' => $details['account_name'],
                'memo_template' => $details['memo_template'],
                'allow_all_agents' => true,
            ],
        );

        $paymentAccount->markAsDefault();
    }
}
