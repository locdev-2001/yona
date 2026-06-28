<?php

namespace App\Modules\Integration;

use App\Models\ZaloConnection;

/**
 * Catalog of available integrations for the /integrations page.
 *
 * ponytail: 1 real entry. Add an entry when a real driver exists — no ComingSoon scaffolding.
 * No enums — 1 category (chat), 2 bool states, enums would be YAGNI.
 */
class IntegrationCatalog
{
    /**
     * @return array<int, array{key: string, name: string, category: string, enabled: bool, connected: bool}>
     */
    public function cards(): array
    {
        return [
            [
                'key'       => 'zalo_personal',
                'name'      => 'Zalo cá nhân',
                'category'  => 'chat',
                'enabled'   => (bool) config('integrations.zalo_personal.enabled'),
                'connected' => ZaloConnection::query()->exists(), // workspace-scoped via RLS
            ],
        ];
    }
}
