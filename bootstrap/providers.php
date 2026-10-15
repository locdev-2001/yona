<?php

use App\Agent\Kernel\AgentServiceProvider;
use App\Providers\AppServiceProvider;
use App\Providers\ProductEventServiceProvider;
use App\Providers\TranslationServiceProvider;

return [
    AppServiceProvider::class,
    ProductEventServiceProvider::class,
    TranslationServiceProvider::class,
    AgentServiceProvider::class,
];
