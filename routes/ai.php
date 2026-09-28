<?php

use App\Http\Middleware\AuthenticateStickerLibraryToken;
use App\Mcp\Servers\StickerLibraryServer;
use Laravel\Mcp\Facades\Mcp;

// Mặt tiền MCP (HTTP) của kho sticker: cùng cổng token sticker và cùng lõi với
// REST /api/v1/sticker_library.
Mcp::web(StickerLibraryServer::PATH, StickerLibraryServer::class)
    ->middleware(['api', AuthenticateStickerLibraryToken::class, 'throttle:120,1']);
