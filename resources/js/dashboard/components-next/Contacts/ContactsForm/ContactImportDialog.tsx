import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { t } from '../../../../i18n';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import Button from 'dashboard/components-next/button/Button';
import { fetchDataImports } from 'dashboard/contacts/api';
import type { DataImport } from 'dashboard/contacts/api';

// Port từ components-next/Contacts/ContactsForm/ContactImportDialog.vue.
// Thêm so bản gốc (bản gốc chỉ báo "sẽ gửi email"): sau khi tải lên, hộp thoại
// theo dõi trạng thái lần nhập qua GET /data_imports và cho tải tệp dòng lỗi.
// GET /data_imports đòi feature `data_import` (đúng bản gốc); tài khoản chưa bật
// thì bỏ hẳn khối trạng thái — hộp thoại quay về đúng hành vi gốc.
const SAMPLE_CSV_URL = '/downloads/import-contacts-sample.csv';
const POLL_INTERVAL = 5000;
const RUNNING_STATUSES = ['pending', 'processing'];

interface ContactImportDialogProps {
    accountId: number;
    isImporting?: boolean;
    onImport: (file: File) => void;
}

const processFileName = (fileName: string) => {
    const lastDotIndex = fileName.lastIndexOf('.');
    const extension = fileName.slice(lastDotIndex);
    const baseName = fileName.slice(0, lastDotIndex);

    return baseName.length > 20 ? `${baseName.slice(0, 20)}...${extension}` : fileName;
};

const ContactImportDialog = forwardRef<DialogHandle, ContactImportDialogProps>(function ContactImportDialog(
    { accountId, isImporting = false, onImport },
    ref,
) {
    const dialogRef = useRef<DialogHandle>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFileName, setSelectedFileName] = useState('');
    const [trackedImport, setTrackedImport] = useState<DataImport | null>(null);
    const [isTracking, setTracking] = useState(false);
    const [isStatusUnavailable, setStatusUnavailable] = useState(false);

    useImperativeHandle(ref, () => ({
        open: () => dialogRef.current?.open(),
        close: () => dialogRef.current?.close(),
    }));

    // Theo dõi lần nhập mới nhất tới khi job kết thúc (bản gốc poll 5 giây ở
    // trang Settings › Data).
    useEffect(() => {
        if (!isTracking) return undefined;

        let active = true;
        const poll = async () => {
            const imports = await fetchDataImports(accountId).catch(() => null);
            if (!active) return;

            if (imports === null) {
                setTracking(false);
                setStatusUnavailable(true);
                return;
            }

            const latest = imports.find(item => item.dataType === 'contacts') ?? null;
            setTrackedImport(latest);

            if (latest && !RUNNING_STATUSES.includes(latest.status)) setTracking(false);
        };

        void poll();
        const timer = setInterval(() => void poll(), POLL_INTERVAL);

        return () => {
            active = false;
            clearInterval(timer);
        };
    }, [accountId, isTracking]);

    const handleFileClick = () => fileInputRef.current?.click();

    const handleFileChange = () => {
        const file = fileInputRef.current?.files?.[0] ?? null;
        setSelectedFile(file);
        setSelectedFileName(file ? processFileName(file.name) : '');
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setSelectedFileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const uploadFile = () => {
        if (!selectedFile) return;
        setTrackedImport(null);
        setStatusUnavailable(false);
        setTracking(true);
        onImport(selectedFile);
    };

    const statusLabel = () => {
        if (!trackedImport) return t('CONTACTS_LAYOUT.HEADER.ACTIONS.IMPORT_CONTACT.STATUS.PENDING');

        if (RUNNING_STATUSES.includes(trackedImport.status)) {
            return t('CONTACTS_LAYOUT.HEADER.ACTIONS.IMPORT_CONTACT.STATUS.PROCESSING');
        }
        if (trackedImport.status === 'failed') {
            return t('CONTACTS_LAYOUT.HEADER.ACTIONS.IMPORT_CONTACT.STATUS.FAILED');
        }

        return t('CONTACTS_LAYOUT.HEADER.ACTIONS.IMPORT_CONTACT.STATUS.COMPLETED', {
            processed: trackedImport.processedRecords ?? 0,
            total: trackedImport.totalRecords ?? 0,
        });
    };

    const showProgress = !isStatusUnavailable && (isTracking || trackedImport !== null);

    return (
        <Dialog
            ref={dialogRef}
            title={t('CONTACTS_LAYOUT.HEADER.ACTIONS.IMPORT_CONTACT.TITLE')}
            confirmButtonLabel={t('CONTACTS_LAYOUT.HEADER.ACTIONS.IMPORT_CONTACT.IMPORT')}
            isLoading={isImporting}
            disableConfirmButton={isImporting}
            descriptionSlot={
                <p className="mb-0 text-sm text-n-slate-11">
                    {t('CONTACTS_LAYOUT.HEADER.ACTIONS.IMPORT_CONTACT.DESCRIPTION')}{' '}
                    <a
                        href={SAMPLE_CSV_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        download="import-contacts-sample.csv"
                        className="text-n-blue-11"
                    >
                        {t('CONTACTS_LAYOUT.HEADER.ACTIONS.IMPORT_CONTACT.DOWNLOAD_LABEL')}
                    </a>
                </p>
            }
            onConfirm={uploadFile}
        >
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-n-slate-12 whitespace-nowrap">
                        {t('CONTACTS_LAYOUT.HEADER.ACTIONS.IMPORT_CONTACT.LABEL')}
                    </label>
                    <div className="flex items-center justify-between w-full gap-2">
                        {selectedFile ? <span className="text-sm text-n-slate-12">{selectedFileName}</span> : null}
                        {!selectedFile ? (
                            <Button
                                label={t('CONTACTS_LAYOUT.HEADER.ACTIONS.IMPORT_CONTACT.CHOOSE_FILE')}
                                icon="i-lucide-upload"
                                color="slate"
                                variant="ghost"
                                size="sm"
                                className="!w-fit"
                                onClick={handleFileClick}
                            />
                        ) : (
                            <div className="flex items-center gap-1">
                                <Button
                                    label={t('CONTACTS_LAYOUT.HEADER.ACTIONS.IMPORT_CONTACT.CHANGE')}
                                    color="slate"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleFileClick}
                                />
                                <div className="w-px h-3 bg-n-strong" />
                                <Button
                                    icon="i-lucide-trash"
                                    color="slate"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleRemoveFile}
                                />
                            </div>
                        )}
                    </div>
                </div>
                {showProgress ? (
                    <div className="flex flex-col gap-1" data-testid="contact-import-status">
                        <span className="text-sm text-n-slate-11">{statusLabel()}</span>
                        {trackedImport?.failedRecordsUrl ? (
                            <a
                                href={trackedImport.failedRecordsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-n-blue-11 w-fit"
                            >
                                {t('CONTACTS_LAYOUT.HEADER.ACTIONS.IMPORT_CONTACT.DOWNLOAD_FAILED_RECORDS')}
                            </a>
                        ) : null}
                    </div>
                ) : null}
            </div>
            <input ref={fileInputRef} type="file" accept="text/csv" className="hidden" onChange={handleFileChange} />
        </Dialog>
    );
});

export default ContactImportDialog;
