import { useMemo } from 'react';

import { t } from '../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import Button from 'dashboard/components-next/button/Button';

// Port từ dashboard/components/Code.vue (woot-code). B1 chỉ hiển thị
// token/identifier một dòng nên bỏ highlight.js — khối <pre class="hljs">
// ăn style code.hljs đã port trong _base.scss; CodePen form vào cùng widget (C1).
interface CodeProps {
    script?: string;
    className?: string;
}

function scrubScript(script: string): string {
    const scrubbed = script.replace(/^\s*[\r\n]/gm, '');
    const lines = scrubbed.split('\n');

    const minIndent = lines.reduce((min, line) => {
        if (line.trim().length === 0) return min;
        const indent = (line.match(/^\s*/) as RegExpMatchArray)[0].length;
        return Math.min(min, indent);
    }, Infinity);

    return lines.map(line => line.slice(minIndent)).join('\n');
}

export default function Code({ script = '', className = '' }: CodeProps) {
    const scrubbedScript = useMemo(() => scrubScript(script), [script]);

    const onCopy = async () => {
        await copyTextToClipboard(scrubbedScript);
        useAlert(t('COMPONENTS.CODE.COPY_SUCCESSFUL'));
    };

    return (
        <div className={`relative text-left ${className}`}>
            <div className="top-1.5 absolute ltr:right-1.5 rtl:left-1.5 flex backdrop-blur-sm rounded-lg items-center gap-1">
                <Button
                    slate
                    xs
                    faded
                    label={t('COMPONENTS.CODE.BUTTON_TEXT')}
                    onClick={() => void onCopy()}
                />
            </div>
            {script ? (
                <pre className="[&_code]:text-start">
                    <code className="hljs">{scrubbedScript}</code>
                </pre>
            ) : null}
        </div>
    );
}
