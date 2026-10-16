<?php

namespace App\Agent\Kernel\Commands;

use App\Agent\Boundary\Evals\EvalShopSeeder;
use App\Agent\Evals\ShopFixture;
use Illuminate\Console\Command;
use Throwable;

// Dựng (hoặc cập nhật cho khớp tệp) shop mẫu của bộ chấm. Chạy lại không nhân đôi gì.
final class EvalSeedCommand extends Command
{
    protected $signature = 'agent:eval:seed';

    protected $description = 'Dựng shop mẫu "Shop mẫu Eval" (dữ liệu giả) cho bộ chấm hội thoại nhân viên AI';

    public function handle(EvalShopSeeder $seeder): int
    {
        if ($this->laravel->isProduction()) {
            $this->components->error('Shop mẫu chỉ dựng trên máy dev, từ chối chạy trên production.');

            return self::FAILURE;
        }

        try {
            $fixture = ShopFixture::fromFile();
            $shop = $seeder->seed($fixture);
        } catch (Throwable $exception) {
            $this->components->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->components->info("Shop mẫu sẵn sàng: account #{$shop->accountId} \"{$fixture->account['name']}\".");
        $this->components->twoColumnDetail('Inbox website', "#{$shop->inboxId} {$fixture->inbox['name']}");
        $this->components->twoColumnDetail('Nhân viên AI', "#{$shop->aiAgentId} {$fixture->aiAgent['name']}");
        $this->components->twoColumnDetail('Đăng nhập', "{$fixture->admin['email']} (mật khẩu trong ".basename(ShopFixture::DEFAULT_FILE).')');
        $this->components->twoColumnDetail('Câu trả lời mẫu / sản phẩm', count($fixture->cannedResponses).' / '.count($fixture->products));

        return self::SUCCESS;
    }
}
