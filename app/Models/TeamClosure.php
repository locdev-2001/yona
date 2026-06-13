<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Closure-table row: one (ancestor, descendant, depth) edge of the team tree.
 * Composite primary key, no timestamps. Written by TeamService.
 */
class TeamClosure extends Model
{
    protected $table = 'team_closure';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'workspace_id',
        'ancestor_id',
        'descendant_id',
        'depth',
    ];

    protected function casts(): array
    {
        return ['depth' => 'integer'];
    }
}
