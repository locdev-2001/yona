<?php

namespace App\Exceptions;

use RuntimeException;

// Tương đương CSV::MalformedCSVError của Ruby.
class MalformedCsvException extends RuntimeException {}
