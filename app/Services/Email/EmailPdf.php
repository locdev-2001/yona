<?php

namespace App\Services\Email;

final readonly class EmailPdf
{
    public const CONTENT_TYPE = 'application/pdf';

    /** @param  list<int>  $embeddedAttachmentIds  đính kèm của thư đã nằm trong trang PDF */
    public function __construct(
        public string $contents,
        public string $filename,
        public array $embeddedAttachmentIds,
    ) {}
}
