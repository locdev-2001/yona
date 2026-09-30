<?php

namespace App\Http\RequestSigning;

use App\Http\RequestSigning\Subjects\SigningSubject;
use InvalidArgumentException;

final class SigningSubjects
{
    public function for(string $surface): SigningSubject
    {
        $subjectClass = config('request_protection.signing.subjects.'.$surface);

        if (! is_string($subjectClass)) {
            throw new InvalidArgumentException("Unknown request signing surface [{$surface}].");
        }

        return app($subjectClass);
    }
}
