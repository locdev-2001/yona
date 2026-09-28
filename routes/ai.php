<?php

use App\Http\Middleware\AuthenticatePlatformApp;
use App\Mcp\Servers\StickerLibraryServer;
use Laravel\Mcp\Facades\Mcp;

// Mặt tiền MCP (HTTP): cùng lõi với Platform API, xác thực bằng token Platform App
// (header api_access_token hoặc Authorization: Bearer).
Mcp::web(StickerLibraryServer::PATH, StickerLibraryServer::class)
    ->middleware(['api', AuthenticatePlatformApp::class, 'throttle:120,1']);
