import { useEffect, useId, useRef, useState } from 'react';
import { Archive, Check, FileText, FileUp, Image, Paperclip, RotateCcw, Trash2, X } from '@admin/components/icons';
import { PreviewButton } from './components';
import { previewCopy, previewText } from './copy';
import './file-range.css';

type AttachmentState = 'preparing' | 'ready' | 'attached' | 'error';
type AttachmentEntry = { id: string; file: File; state: AttachmentState; progress: number };
type PrepareFile = (file: File, reportProgress: (progress: number) => void, signal: AbortSignal) => Promise<void>;
const attachmentLimit = { count: 5, bytes: 25 * 1024 * 1024 };

function fileIdentity(file: File): string {
    return `${file.name}:${file.size}:${file.lastModified}`;
}
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const megabytes = bytes / (1024 * 1024);
    return megabytes >= 1
        ? `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(megabytes)} MB`
        : `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(bytes / 1024)} KB`;
}
function AttachmentIcon({ file }: { file: File }) {
    const Icon = file.type.startsWith('image/') ? Image : file.name.toLowerCase().endsWith('.zip') ? Archive : FileText;
    return <Icon aria-hidden="true" />;
}

export function FileUpload({
    prepareFile,
    onAttach,
    onChooseSamples,
}: {
    prepareFile: PrepareFile;
    onAttach: (files: File[]) => void;
    onChooseSamples?: () => File[];
}) {
    const [entries, setEntries] = useState<AttachmentEntry[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const controllersRef = useRef(new Map<string, AbortController>());
    const dragDepthRef = useRef(0);
    const inputId = useId();
    const limitsId = useId();
    const errorsId = useId();
    useEffect(() => {
        const controllers = controllersRef.current;
        return () => {
            controllers.forEach((controller) => controller.abort());
            controllers.clear();
        };
    }, []);
    const preparing = entries.filter((entry) => entry.state === 'preparing').length;
    const ready = entries.filter((entry) => entry.state === 'ready');
    const attached = entries.filter((entry) => entry.state === 'attached').length;

    function processEntry(entry: AttachmentEntry) {
        const controller = new AbortController();
        controllersRef.current.set(entry.id, controller);
        const update = (patch: Partial<AttachmentEntry>) =>
            setEntries((current) => current.map((item) => (item.id === entry.id ? { ...item, ...patch } : item)));
        void prepareFile(
            entry.file,
            (progress) => {
                if (!controller.signal.aborted) update({ progress: Math.max(0, Math.min(100, Math.round(progress))) });
            },
            controller.signal,
        )
            .then(() => {
                if (!controller.signal.aborted) update({ state: 'ready', progress: 100 });
            })
            .catch(() => {
                if (!controller.signal.aborted) update({ state: 'error' });
            })
            .finally(() => {
                if (controllersRef.current.get(entry.id) === controller) controllersRef.current.delete(entry.id);
            });
    }
    function addFiles(files: File[]) {
        const identities = new Set(entries.map((entry) => entry.id));
        const accepted: AttachmentEntry[] = [];
        const messages: string[] = [];
        for (const file of files) {
            const id = fileIdentity(file);
            if (identities.has(id)) continue;
            if (file.size > attachmentLimit.bytes) {
                messages.push(previewText('upload_too_large', file.name));
                continue;
            }
            if (file.size === 0) {
                messages.push(previewText('upload_empty_file', file.name));
                continue;
            }
            if (entries.length + accepted.length >= attachmentLimit.count) {
                messages.push(previewCopy.upload_too_many);
                break;
            }
            identities.add(id);
            accepted.push({ id, file, state: 'preparing', progress: 0 });
        }
        setErrors(messages);
        if (accepted.length === 0) return;
        setEntries((current) => [...current, ...accepted]);
        accepted.forEach(processEntry);
    }
    function removeEntry(id: string) {
        controllersRef.current.get(id)?.abort();
        controllersRef.current.delete(id);
        setEntries((current) => current.filter((entry) => entry.id !== id));
    }
    function clearFiles() {
        controllersRef.current.forEach((controller) => controller.abort());
        controllersRef.current.clear();
        setEntries([]);
        setErrors([]);
        if (inputRef.current) inputRef.current.value = '';
    }
    function attachFiles() {
        onAttach(ready.map((entry) => entry.file));
        setEntries((current) =>
            current.map((entry) => (entry.state === 'ready' ? { ...entry, state: 'attached' } : entry)),
        );
    }
    return (
        <section className="preview-file-upload" aria-label={previewCopy.upload_title}>
            <header className="preview-upload-heading">
                <h3>{previewCopy.upload_title}</h3>
                <p>{previewCopy.upload_description}</p>
            </header>
            <div
                className="preview-upload-dropzone"
                data-dragging={dragging}
                onDragEnter={(event) => {
                    event.preventDefault();
                    if (event.dataTransfer.types.includes('Files')) {
                        dragDepthRef.current += 1;
                        setDragging(true);
                    }
                }}
                onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'copy';
                }}
                onDragLeave={(event) => {
                    event.preventDefault();
                    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
                    if (dragDepthRef.current === 0) setDragging(false);
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    dragDepthRef.current = 0;
                    setDragging(false);
                    addFiles(Array.from(event.dataTransfer.files));
                }}
            >
                <input
                    ref={inputRef}
                    id={inputId}
                    className="preview-upload-native"
                    type="file"
                    multiple
                    aria-label={previewCopy.upload_choose}
                    aria-describedby={limitsId}
                    onChange={(event) => {
                        addFiles(Array.from(event.target.files ?? []));
                        event.target.value = '';
                    }}
                />
                <label htmlFor={inputId} className="preview-upload-target">
                    <span className="preview-upload-illustration">
                        <FileUp />
                    </span>
                    <span className="preview-upload-instruction">
                        <strong>{previewCopy.upload_click}</strong> {previewCopy.upload_or_drop}
                    </span>
                    <span className="preview-upload-limits" id={limitsId}>
                        {previewCopy.upload_limits}
                    </span>
                </label>
            </div>
            {errors.length > 0 && (
                <div className="preview-upload-errors" id={errorsId} role="alert">
                    {errors.map((message) => (
                        <p key={message}>{message}</p>
                    ))}
                </div>
            )}
            <div className="preview-upload-list-heading">
                <span role="status">
                    {preparing > 0
                        ? previewText('upload_preparing_count', preparing)
                        : entries.length > 0
                          ? previewText('upload_selected_count', entries.length)
                          : previewCopy.upload_no_files}
                </span>
                {onChooseSamples && entries.length === 0 && (
                    <PreviewButton appearance="ghost" onClick={() => addFiles(onChooseSamples())}>
                        {previewCopy.upload_try_samples}
                    </PreviewButton>
                )}
            </div>
            {entries.length > 0 && (
                <ul className="preview-upload-files">
                    {entries.map((entry) => (
                        <li key={entry.id} className="preview-upload-file" data-state={entry.state}>
                            <span className="preview-upload-file-icon">
                                <AttachmentIcon file={entry.file} />
                            </span>
                            <div className="preview-upload-file-info">
                                <strong title={entry.file.name}>{entry.file.name}</strong>
                                <span>
                                    {formatFileSize(entry.file.size)}
                                    <span aria-hidden="true"> · </span>
                                    {entry.state === 'preparing'
                                        ? previewCopy.upload_preparing
                                        : entry.state === 'error'
                                          ? previewCopy.upload_read_failed
                                          : entry.state === 'attached'
                                            ? previewCopy.upload_attached
                                            : previewCopy.upload_ready}
                                </span>
                            </div>
                            <div className="preview-upload-file-actions">
                                {entry.state === 'error' && (
                                    <PreviewButton
                                        appearance="ghost"
                                        className="upload-icon-button"
                                        aria-label={previewText('upload_retry', entry.file.name)}
                                        onClick={() => {
                                            setEntries((current) =>
                                                current.map((item) =>
                                                    item.id === entry.id
                                                        ? { ...item, state: 'preparing', progress: 0 }
                                                        : item,
                                                ),
                                            );
                                            processEntry(entry);
                                        }}
                                    >
                                        <RotateCcw />
                                    </PreviewButton>
                                )}
                                <PreviewButton
                                    appearance="ghost"
                                    className="upload-icon-button"
                                    aria-label={previewText(
                                        entry.state === 'preparing' ? 'upload_cancel_file' : 'upload_remove_file',
                                        entry.file.name,
                                    )}
                                    onClick={() => removeEntry(entry.id)}
                                >
                                    {entry.state === 'preparing' ? <X /> : <Trash2 />}
                                </PreviewButton>
                                {entry.state === 'preparing' ? (
                                    <span className="preview-upload-percent">{entry.progress}%</span>
                                ) : (
                                    entry.state !== 'error' && <Check className="preview-upload-ready" />
                                )}
                            </div>
                            {entry.state === 'preparing' && (
                                <div
                                    className="preview-upload-progress"
                                    role="progressbar"
                                    aria-label={previewText('upload_progress', entry.file.name)}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={entry.progress}
                                >
                                    <span style={{ width: `${entry.progress}%` }} />
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            <footer className="preview-upload-footer">
                <PreviewButton
                    appearance="ghost"
                    disabled={entries.length === 0 && errors.length === 0}
                    onClick={clearFiles}
                >
                    {previewCopy.huy}
                </PreviewButton>
                <PreviewButton
                    appearance="primary"
                    disabled={ready.length === 0 || preparing > 0}
                    onClick={attachFiles}
                >
                    <Paperclip />
                    {ready.length > 0 ? previewText('upload_attach_count', ready.length) : previewCopy.upload_attach}
                </PreviewButton>
            </footer>
            {attached > 0 && (
                <p className="preview-upload-result" role="status">
                    <Check />
                    {previewText('upload_attached_count', attached)}
                </p>
            )}
        </section>
    );
}

export function prepareLocalFile(
    file: File,
    reportProgress: (value: number) => void,
    signal: AbortSignal,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const abort = () => reader.abort();
        if (signal.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
        }
        signal.addEventListener('abort', abort, { once: true });
        const cleanup = () => signal.removeEventListener('abort', abort);
        reader.onprogress = (event) => {
            if (event.lengthComputable) reportProgress((event.loaded / event.total) * 100);
        };
        reader.onload = () => {
            cleanup();
            reportProgress(100);
            resolve();
        };
        reader.onerror = () => {
            cleanup();
            reject(reader.error);
        };
        reader.onabort = () => {
            cleanup();
            reject(new DOMException('Aborted', 'AbortError'));
        };
        reader.readAsArrayBuffer(file);
    });
}
