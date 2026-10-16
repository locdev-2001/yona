<?php

namespace App\Agent\Evals;

use RuntimeException;

// Khách giả hoặc giám khảo không cho được câu trả lời dùng được sau mọi lần thử.
final class EvalCallFailed extends RuntimeException {}
