<?php

use App\Providers\AppServiceProvider;
use App\Providers\HorizonServiceProvider;
use App\Providers\ModuleServiceProvider;
use App\Providers\MorphMapServiceProvider;
use App\Providers\TelescopeServiceProvider;

return [
    AppServiceProvider::class,
    HorizonServiceProvider::class,
    TelescopeServiceProvider::class,
    MorphMapServiceProvider::class,
    ModuleServiceProvider::class,
];
