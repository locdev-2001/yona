<?php

use App\Providers\AnnouncementsServiceProvider;
use App\Providers\AppServiceProvider;
use App\Providers\CrmSalesServiceProvider;
use App\Providers\EmailServiceProvider;
use App\Providers\HorizonServiceProvider;
use App\Providers\IdentityServiceProvider;
use App\Providers\ModuleServiceProvider;
use App\Providers\MorphMapServiceProvider;
use App\Providers\ProjectsServiceProvider;
use App\Providers\SharedServiceProvider;
use App\Providers\TelescopeServiceProvider;
use App\Providers\TenancyServiceProvider;

return [
    AppServiceProvider::class,
    HorizonServiceProvider::class,
    TelescopeServiceProvider::class,
    MorphMapServiceProvider::class,
    TenancyServiceProvider::class,
    IdentityServiceProvider::class,
    SharedServiceProvider::class,
    EmailServiceProvider::class,
    AnnouncementsServiceProvider::class,
    ProjectsServiceProvider::class,
    ModuleServiceProvider::class,
    // Registered AFTER ModuleServiceProvider so it overrides cdp's no-op
    // IdentityResolver binding with the real dedup impl (the old topo-sort F10
    // invariant). This override is collapsed in phase 1d when cdp moves.
    CrmSalesServiceProvider::class,
];
