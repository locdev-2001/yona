<?php

namespace App\Console\Commands;

use App\Models\SuperAdmin;
use App\Models\User;
use Illuminate\Console\Command;

// Tương đương `rails c` + `SuperAdmin.create!` của bản gốc: nâng một user sẵn có
// lên super admin hoặc tạo mới, để có lối vào console quản trị lần đầu.
class CreateSuperAdmin extends Command
{
    protected $signature = 'super-admin:create {email} {--name=} {--password=}';

    protected $description = 'Tạo hoặc nâng một tài khoản lên super admin của console quản trị';

    public function handle(): int
    {
        $email = mb_strtolower((string) $this->argument('email'));
        $password = (string) ($this->option('password') ?: $this->secret('Mật khẩu super admin'));

        if ($password === '') {
            $this->error('Cần mật khẩu.');

            return self::FAILURE;
        }

        $user = User::query()->where('email', $email)->first();

        if ($user === null) {
            $superAdmin = new SuperAdmin;
            $superAdmin->fill([
                'name' => (string) ($this->option('name') ?: 'Super Admin'),
                'email' => $email,
                'password' => $password,
                'confirmed_at' => now(),
            ]);
            $superAdmin->save();

            $this->info("Đã tạo super admin {$email}.");

            return self::SUCCESS;
        }

        $user->type = SuperAdmin::TYPE;
        $user->password = $password;
        $user->confirmed_at ??= now();
        $user->save();

        $this->info("Đã nâng {$email} lên super admin.");

        return self::SUCCESS;
    }
}
