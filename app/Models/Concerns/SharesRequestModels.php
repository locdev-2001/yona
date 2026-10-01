<?php

namespace App\Models\Concerns;

use App\Support\SharedModels;

// Lazy-load account/contact/user (belongsTo, morphTo) đi qua SharedModels: cùng id trong
// một request/job chỉ một truy vấn.
trait SharesRequestModels
{
    protected function getRelationshipFromMethod($method)
    {
        $shared = SharedModels::forRelation($this, $method);

        if ($shared === null) {
            return parent::getRelationshipFromMethod($method);
        }

        $this->setRelation($method, $shared);

        return $shared;
    }
}
