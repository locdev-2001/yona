<?php

namespace App\Support;

use DOMDocument;
use DOMElement;

// SVG tải lên được phục vụ cùng tên miền với ứng dụng: mở thẳng tệp là trình
// duyệt chạy script bên trong. Chỉ nhận SVG thuần hình vẽ — không script, không
// thuộc tính sự kiện, không nhúng HTML, không liên kết javascript:, không DTD.
final class SafeSvg
{
    private const FORBIDDEN_ELEMENTS = ['script', 'foreignobject', 'iframe', 'embed', 'object', 'handler', 'listener'];

    private const FORBIDDEN_LINK_SCHEMES = ['javascript:', 'vbscript:', 'data:text/html'];

    public static function isSafe(string $contents): bool
    {
        if ($contents === '' || stripos($contents, '<!DOCTYPE') !== false || stripos($contents, '<!ENTITY') !== false) {
            return false;
        }

        $document = new DOMDocument;
        $previous = libxml_use_internal_errors(true);
        $isLoaded = $document->loadXML($contents, LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $root = $document->documentElement;
        if (! $isLoaded || $root === null || strtolower($root->localName) !== 'svg') {
            return false;
        }

        foreach ($document->getElementsByTagName('*') as $element) {
            if (! self::isSafeElement($element)) {
                return false;
            }
        }

        return true;
    }

    private static function isSafeElement(DOMElement $element): bool
    {
        if (in_array(strtolower($element->localName), self::FORBIDDEN_ELEMENTS, true)) {
            return false;
        }

        foreach ($element->attributes as $attribute) {
            $name = strtolower($attribute->localName);
            if (str_starts_with($name, 'on')) {
                return false;
            }

            $value = strtolower(preg_replace('/\s+/', '', $attribute->value) ?? '');
            foreach (self::FORBIDDEN_LINK_SCHEMES as $scheme) {
                if (str_starts_with($value, $scheme)) {
                    return false;
                }
            }
        }

        return true;
    }
}
