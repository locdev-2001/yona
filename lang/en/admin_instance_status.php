<?php

return [
    'METRICS' => [
        'VERSION' => 'Yona version',
        'POSTGRES' => 'Postgres connection',
        'MIGRATIONS' => 'Database migrations',
        'REDIS' => 'Redis connection',
        'REDIS_VERSION' => 'Redis version',
        'REDIS_CLIENTS' => 'Connected Redis clients',
        'REDIS_MEMORY' => 'Redis memory used',
        'REDIS_PEAK' => 'Redis peak memory',
        'REDIS_MAX_MEMORY' => 'Redis maxmemory',
        'REDIS_POLICY' => 'Redis maxmemory policy',
    ],
    'STATUS' => [
        'true' => 'Connected',
        'false' => 'Disconnected',
        'completed' => 'Up to date',
        'pending' => 'Pending migrations',
    ],
];
