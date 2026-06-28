<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectDiscussion;
use Illuminate\Support\Facades\DB;
use Modules\Shared\Models\Comment;
use App\Support\Activity\ActivityLogger;

/**
 * P08 — Discussion thread and reply operations.
 * Replies use P03 HasComments (commentable = ProjectDiscussion, morph alias 'project_discussion').
 * DRY: no separate comment table — reuses `comments` polymorphic.
 */
class ProjectDiscussionService
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {}

    /**
     * Open a new discussion thread on a project.
     *
     * @param  array<string, mixed>  $data
     */
    public function open(Project $project, array $data, ?int $authorId): ProjectDiscussion
    {
        return DB::transaction(function () use ($project, $data, $authorId): ProjectDiscussion {
            $discussion = new ProjectDiscussion;
            $discussion->workspace_id = $project->workspace_id;
            $discussion->project_id = $project->id;
            $discussion->fill($data);
            $discussion->author_id = $authorId ?? auth()->id();
            $discussion->created_by = auth()->id();
            $discussion->updated_by = auth()->id();
            $discussion->save();

            $this->activityLogger->log(
                $project,
                'project_discussion_opened',
                [
                    'discussion_id' => $discussion->id,
                    'subject' => $discussion->subject,
                ],
                (bool) ($data['show_to_customer'] ?? false)
            );

            return $discussion;
        });
    }

    /**
     * Reply to a discussion thread via HasComments (P03).
     * morph: commentable_type = 'project_discussion' (G3 alias).
     *
     * @param  array<string, mixed>  $data  ['body', 'parent_id']
     */
    public function reply(ProjectDiscussion $discussion, array $data, ?int $authorId): Comment
    {
        $comment = new Comment;
        $comment->workspace_id = $discussion->workspace_id;
        $comment->commentable_type = 'project_discussion'; // G3 morph alias
        $comment->commentable_id = $discussion->id;
        $comment->body = $data['body'];
        $comment->parent_id = $data['parent_id'] ?? null;
        $comment->user_id = $authorId ?? auth()->id();
        $comment->created_by = auth()->id();
        $comment->save();

        return $comment;
    }
}
