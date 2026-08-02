<?php

it('closes and clears the QR panel after promote succeeds', function () {
    $source = file_get_contents(
        dirname(__DIR__, 3).'/resources/js/pages/integration/zalo/index.tsx'
    );

    expect($source)
        ->toContain("if (data.ok) {\n                setQrState(INITIAL_QR);");
});
