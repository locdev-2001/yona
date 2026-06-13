<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a team-tree operation would violate hierarchy integrity
 * (a cycle, BR-X13) or other structural guard.
 */
class TeamHierarchyException extends RuntimeException {}
