<?php

namespace App\Modules\Automation\Handlers;

use App\Models\Tag;
use App\Models\WorkflowRun;
use App\Modules\Automation\Contracts\NodeHandler;
use App\Modules\Automation\NodeHandlerResult;
use App\Services\TagService;
use Illuminate\Support\Str;

/**
 * Gắn/Gỡ Tag (action) — delegate TagService::attach()/detach(). Node config
 * chọn attach vs detach.
 */
class TagNodeHandler implements NodeHandler
{
    public function __construct(private readonly TagService $tags) {}

    public function type(): string
    {
        return 'tag';
    }

    public function handle(WorkflowRun $run, array $node): NodeHandlerResult
    {
        $subject = $run->subject();

        if ($subject === null) {
            return NodeHandlerResult::skipped('subject not found', branch: null);
        }

        $config = $node['config'] ?? [];
        $tagName = $config['tag'] ?? null;

        if ($tagName === null) {
            return NodeHandlerResult::failed('no tag name configured');
        }

        if (($config['action'] ?? 'attach') === 'detach') {
            // Match TagService::attach()'s own identity key — it dedups/creates
            // by slug, not raw name, so a lookup by `name` here could miss an
            // existing tag with different casing/spacing than when it was attached.
            $tag = Tag::where('slug', Str::slug($tagName))->first();

            if ($tag === null) {
                return NodeHandlerResult::skipped("tag \"{$tagName}\" does not exist", branch: null);
            }

            $this->tags->detach($subject, $tag);

            return NodeHandlerResult::success("detached tag {$tagName}");
        }

        $this->tags->attach($subject, $tagName, $config['color'] ?? null);

        return NodeHandlerResult::success("attached tag {$tagName}");
    }
}
