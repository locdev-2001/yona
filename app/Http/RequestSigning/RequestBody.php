<?php

namespace App\Http\RequestSigning;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

// Cách máy chủ nhìn thân request khi kiểm chữ ký: JSON/thân thô ký theo byte, form/multipart
// ký theo trường chữ + băm tệp (xem SignedRequestProtocol::multipartDigest).
final class RequestBody
{
    public static function isForm(Request $request): bool
    {
        return ! $request->isJson() && $request->getContentTypeFormat() === 'form';
    }

    public static function digest(Request $request): string
    {
        if (! self::isForm($request)) {
            return SignedRequestProtocol::rawBodyDigest($request->getContent());
        }

        $fields = array_map(
            fn (mixed $value) => is_scalar($value) ? (string) $value : (string) json_encode($value),
            $request->request->all(),
        );
        $files = array_map(fn (UploadedFile $file) => [
            'sha256' => (string) hash_file('sha256', $file->getRealPath()),
            'size' => (int) $file->getSize(),
        ], self::files($request));

        return SignedRequestProtocol::multipartDigest($fields, $files);
    }

    /** @return list<UploadedFile> */
    private static function files(Request $request): array
    {
        $files = [];
        $allFiles = $request->allFiles();
        array_walk_recursive($allFiles, function (mixed $file) use (&$files) {
            if ($file instanceof UploadedFile) {
                $files[] = $file;
            }
        });

        return $files;
    }
}
