import { useMemo } from 'react';
import hljs from 'highlight.js/lib/common';
import 'highlight.js/styles/default.css';

import { t } from '../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import Button from 'dashboard/components-next/button/Button';

// Port từ dashboard/components/Code.vue (woot-code). Khối <pre><code> do
// @highlightjs/vue-plugin 2.1.0 dựng: autodetect mặc định bật nên nó luôn gọi
// highlightAuto rồi gắn class `hljs {ngôn ngữ dò được}` — bản React giữ y vậy.
interface CodeProps {
    script?: string;
    lang?: string;
    enableCodePen?: boolean;
    codepenTitle?: string;
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

export default function Code({
    script = '',
    lang = 'javascript',
    enableCodePen = false,
    codepenTitle = 'Codepen',
    className = '',
}: CodeProps) {
    const scrubbedScript = useMemo(() => scrubScript(script), [script]);

    const highlighted = useMemo(() => {
        if (!script) return { className: 'hljs', value: '' };
        const result = hljs.highlightAuto(scrubbedScript);

        return { className: `hljs ${result.language ?? ''}`, value: result.value };
    }, [script, scrubbedScript]);

    const codepenScriptValue = useMemo(
        () =>
            JSON.stringify({
                title: codepenTitle,
                private: true,
                [lang === 'javascript' ? 'js' : lang]: scrubbedScript,
            }),
        [codepenTitle, lang, scrubbedScript],
    );

    const onCopy = async () => {
        await copyTextToClipboard(scrubbedScript);
        useAlert(t('COMPONENTS.CODE.COPY_SUCCESSFUL'));
    };

    return (
        <div className={`relative text-left ${className}`}>
            <div className="top-1.5 absolute ltr:right-1.5 rtl:left-1.5 flex backdrop-blur-sm rounded-lg items-center gap-1">
                {enableCodePen ? (
                    <form
                        className="flex items-center"
                        action="https://codepen.io/pen/define"
                        method="POST"
                        target="_blank"
                    >
                        <input type="hidden" name="data" value={codepenScriptValue} />
                        <Button slate xs type="submit" faded label={t('COMPONENTS.CODE.CODEPEN')} />
                    </form>
                ) : null}
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
                    <code
                        className={highlighted.className}
                        dangerouslySetInnerHTML={{ __html: highlighted.value }}
                    />
                </pre>
            ) : null}
        </div>
    );
}
