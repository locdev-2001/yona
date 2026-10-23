import { previewCopy, previewText } from './copy';
import { FileUpload, prepareLocalFile } from './file-upload';
import { RangeField } from './range-field';
import { Eye, EyeOff, Mail, Search } from '@admin/components/icons';
import { useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@admin/components/ui/input';
import { Textarea } from '@admin/components/ui/textarea';
import { Checkbox } from '@admin/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@admin/components/ui/radio-group';
import { Switch } from '@admin/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@admin/components/ui/select';
import {
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxList,
} from '@admin/components/ui/combobox';
import { PreviewButton, StatusBadge } from './components';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@admin/components/ui/input-group';
import { spacingPixels } from './tokens';

export function TextFieldDemo() {
    const [email, setEmail] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [invalidEmail, setInvalidEmail] = useState(false);
    const passwordInputRef = useRef<HTMLInputElement>(null);
    return (
        <form
            className="catalogue-form"
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
                setInvalidEmail(!valid);
                if (valid) toast.success(previewCopy.da_luu_bieu_mau_minh_hoa);
            }}
        >
            <label className="catalogue-field">
                <span>
                    {previewCopy.ten_hien_thi} <small>{previewCopy.bat_buoc}</small>
                </span>
                <Input placeholder={previewCopy.nhap_ten_hien_thi} defaultValue={previewCopy.quan_tri_vien_yona} />
            </label>
            <label className="catalogue-field">
                <span>{previewCopy.dia_chi_email}</span>
                <InputGroup>
                    <InputGroupAddon align="inline-start">
                        <Mail aria-hidden="true" />
                    </InputGroupAddon>
                    <InputGroupInput
                        type="email"
                        aria-label={previewCopy.email_trong_bieu_mau_minh_hoa}
                        placeholder="ban@yona.vn"
                        value={email}
                        onChange={(event) => {
                            setEmail(event.target.value);
                            setInvalidEmail(false);
                        }}
                        aria-invalid={invalidEmail}
                        aria-describedby="catalogue-email-feedback"
                    />
                </InputGroup>
                <small id="catalogue-email-feedback" className={invalidEmail ? 'catalogue-error' : ''}>
                    {invalidEmail
                        ? previewCopy.nhap_dia_chi_email_hop_le_de_tiep_tuc
                        : previewCopy.thong_tin_duoc_giu_trong_ban_minh_hoa}
                </small>
            </label>
            <label className="catalogue-field">
                <span>{previewCopy.mat_khau}</span>
                <InputGroup>
                    <InputGroupInput
                        ref={passwordInputRef}
                        type={passwordVisible ? 'text' : 'password'}
                        defaultValue="MatKhauMinhHoa"
                        aria-label={previewCopy.mat_khau_minh_hoa}
                    />
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={
                                passwordVisible ? previewCopy.an_mat_khau_minh_hoa : previewCopy.hien_mat_khau_minh_hoa
                            }
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                                setPasswordVisible((value) => !value);
                                passwordInputRef.current?.focus();
                            }}
                        >
                            {passwordVisible ? <EyeOff /> : <Eye />}
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
            </label>
            <PreviewButton type="submit" appearance="primary">
                {previewCopy.luu_bieu_mau_minh_hoa}
            </PreviewButton>
        </form>
    );
}

export function TextareaDemo() {
    const [note, setNote] = useState(previewCopy.theo_doi_ket_noi_va_phan_hoi_trong_tuan_nay);
    return (
        <div className="catalogue-form">
            <label className="catalogue-field">
                <span>{previewCopy.ghi_chu_noi_bo}</span>
                <Textarea
                    aria-label={previewCopy.ghi_chu_minh_hoa}
                    value={note}
                    maxLength={240}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={previewCopy.viet_ghi_chu}
                />
                <small>{note.length}/240</small>
            </label>
            <label className="catalogue-field">
                <span>{previewCopy.truong_chi_doc}</span>
                <Input value="YONA-ADMIN-001" readOnly />
            </label>
            <label className="catalogue-field">
                <span>{previewCopy.truong_khong_kha_dung}</span>
                <Input placeholder={previewCopy.chua_co_quyen_chinh_sua} disabled />
            </label>
        </div>
    );
}

export function SelectDemo() {
    const [channel, setChannel] = useState('all');
    const fieldId = useId();
    const labels: Record<string, string> = {
        all: previewCopy.tat_ca_kenh,
        yona: 'Yona',
        zalo: previewCopy.zalo_ca_nhan,
        email: 'Email',
    };
    const options = Object.entries(labels).map(([value, label]) => ({ value, label }));
    return (
        <div className="catalogue-form preview-single-select">
            <div className="catalogue-field">
                <label htmlFor={fieldId}>{previewCopy.kenh_ket_noi_2}</label>
                <Select items={options} value={channel} onValueChange={(value) => setChannel(value ?? 'all')}>
                    <SelectTrigger id={fieldId} aria-label={previewCopy.chon_kenh_minh_hoa}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                        className="catalogue-combobox-popup"
                        align="start"
                        alignItemWithTrigger={false}
                        sideOffset={spacingPixels('control-gap')}
                    >
                        {options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <p className="catalogue-result">
                {previewCopy.dang_loc} <strong>{labels[channel]}</strong>
            </p>
            <div className="catalogue-field">
                <span>{previewCopy.truong_khong_kha_dung}</span>
                <Select
                    disabled
                    value="unavailable"
                    items={[{ value: 'unavailable', label: previewCopy.khong_kha_dung }]}
                >
                    <SelectTrigger aria-label={previewCopy.select_khong_kha_dung}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                        className="catalogue-combobox-popup"
                        align="start"
                        alignItemWithTrigger={false}
                        sideOffset={spacingPixels('control-gap')}
                    >
                        <SelectItem value="unavailable">{previewCopy.khong_kha_dung}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

export function ComboboxDemo() {
    const [channel, setChannel] = useState<string | null>(null);
    const [channelQuery, setChannelQuery] = useState('');
    const anchorRef = useRef<HTMLDivElement>(null);
    const inputId = useId();
    const channelNames = ['Yona', previewCopy.zalo_ca_nhan, 'Email', 'Gmail', 'IMAP'];
    return (
        <div className="catalogue-form catalogue-combobox">
            <div className="catalogue-field">
                <label htmlFor={inputId}>{previewCopy.tim_va_chon_kenh}</label>
                <Combobox
                    items={channelNames}
                    value={channel}
                    onValueChange={setChannel}
                    inputValue={channelQuery}
                    onInputValueChange={setChannelQuery}
                >
                    <div ref={anchorRef} className="catalogue-combobox-anchor">
                        <ComboboxInput
                            id={inputId}
                            aria-label={previewCopy.tim_kenh_trong_combobox}
                            placeholder={previewCopy.go_ten_kenh}
                            showClear={channel !== null || channelQuery.length > 0}
                            keepClearMounted
                            hideTriggerOnClear={false}
                            clearLabel={previewCopy.combobox_clear}
                            triggerLabel={previewCopy.combobox_toggle}
                        >
                            <InputGroupAddon align="inline-start">
                                <Search aria-hidden="true" />
                            </InputGroupAddon>
                        </ComboboxInput>
                    </div>
                    <ComboboxContent
                        anchor={anchorRef}
                        sideOffset={spacingPixels('control-gap')}
                        className="catalogue-combobox-popup"
                    >
                        <ComboboxEmpty>{previewCopy.khong_tim_thay_kenh}</ComboboxEmpty>
                        <ComboboxList>
                            {(channelName: string) => (
                                <ComboboxItem key={channelName} value={channelName}>
                                    {channelName}
                                </ComboboxItem>
                            )}
                        </ComboboxList>
                    </ComboboxContent>
                </Combobox>
            </div>
            <p className="catalogue-result" aria-live="polite">
                {previewCopy.lua_chon} <strong>{channel ?? previewCopy.chua_chon}</strong>
            </p>
        </div>
    );
}

export function SelectionDemo() {
    const [checked, setChecked] = useState(true);
    const [mode, setMode] = useState('daily');
    return (
        <div className="catalogue-form">
            <label className="catalogue-choice">
                <Checkbox
                    checked={checked}
                    onCheckedChange={setChecked}
                    aria-label={previewCopy.nhan_bao_cao_minh_hoa}
                />
                <span>{previewCopy.nhan_bao_cao_tong_hop}</span>
            </label>
            <label className="catalogue-choice">
                <Checkbox disabled defaultChecked aria-label={previewCopy.checkbox_khong_kha_dung} />
                <span>{previewCopy.thiet_lap_khong_kha_dung}</span>
            </label>
            <RadioGroup value={mode} onValueChange={setMode} aria-label={previewCopy.tan_suat_bao_cao_minh_hoa}>
                <label className="catalogue-choice">
                    <RadioGroupItem value="daily" aria-label={previewCopy.hang_ngay} />
                    <span>{previewCopy.hang_ngay}</span>
                </label>
                <label className="catalogue-choice">
                    <RadioGroupItem value="weekly" aria-label={previewCopy.hang_tuan} />
                    <span>{previewCopy.hang_tuan}</span>
                </label>
            </RadioGroup>
            <StatusBadge tone={checked ? 'positive' : 'warning'}>
                {checked ? previewCopy.da_bat_bao_cao : previewCopy.da_tat_bao_cao}
            </StatusBadge>
        </div>
    );
}

export function SwitchDemo() {
    const [notifications, setNotifications] = useState(true);
    const [digest, setDigest] = useState(false);
    return (
        <div className="catalogue-form">
            <label className="catalogue-switch-row">
                <span>
                    <strong>{previewCopy.thong_bao_he_thong}</strong>
                    <small>{previewCopy.cap_nhat_khi_co_su_kien_can_chu_y}</small>
                </span>
                <Switch
                    checked={notifications}
                    onCheckedChange={setNotifications}
                    aria-label={previewCopy.thong_bao_he_thong_minh_hoa}
                />
            </label>
            <label className="catalogue-switch-row">
                <span>
                    <strong>{previewCopy.tom_tat_hang_tuan}</strong>
                    <small>{previewCopy.nhin_lai_hoat_dong_trong_tuan}</small>
                </span>
                <Switch
                    checked={digest}
                    onCheckedChange={setDigest}
                    aria-label={previewCopy.tom_tat_hang_tuan_minh_hoa}
                />
            </label>
            <label className="catalogue-switch-row">
                <span>{previewCopy.thiet_lap_bi_khoa}</span>
                <Switch disabled aria-label={previewCopy.switch_khong_kha_dung} />
            </label>
        </div>
    );
}

export function RangeDemo() {
    const [threshold, setThreshold] = useState(65);
    return (
        <div className="catalogue-form">
            <RangeField
                label={previewCopy.nguong_canh_bao}
                value={threshold}
                onChange={setThreshold}
                marks={[0, 25, 50, 75, 100].map((value) => ({ value, label: `${value}%` }))}
                formatValue={(value) => `${value}%`}
            />
            <label className="catalogue-field">
                <span>{previewCopy.so_dong_moi_trang}</span>
                <Input
                    type="number"
                    min={5}
                    max={100}
                    step={5}
                    defaultValue={20}
                    aria-label={previewCopy.so_dong_minh_hoa}
                />
            </label>
        </div>
    );
}

export function DateTimeDemo() {
    const [date, setDate] = useState('2026-10-22');
    const [time, setTime] = useState('09:00');
    return (
        <div className="catalogue-form">
            <div className="catalogue-field-pair">
                <label className="catalogue-field">
                    <span>{previewCopy.ngay_bat_dau}</span>
                    <Input
                        type="date"
                        aria-label={previewCopy.ngay_minh_hoa}
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                    />
                </label>
                <label className="catalogue-field">
                    <span>{previewCopy.gio_bat_dau}</span>
                    <Input
                        type="time"
                        aria-label={previewCopy.gio_minh_hoa}
                        value={time}
                        onChange={(event) => setTime(event.target.value)}
                    />
                </label>
            </div>
            <p className="catalogue-result">
                {previewCopy.da_chon}{' '}
                <strong>
                    {date} · {time}
                </strong>
            </p>
        </div>
    );
}

export function UploadDemo() {
    return (
        <FileUpload
            prepareFile={prepareLocalFile}
            onAttach={(files) => toast.success(previewText('upload_attached_count', files.length))}
            onChooseSamples={() => [
                new File([previewCopy.upload_sample_report], 'Bao-cao-thang-10.csv', {
                    type: 'text/csv',
                    lastModified: 0,
                }),
                new File([previewCopy.upload_sample_guide], 'Huong-dan-su-dung.txt', {
                    type: 'text/plain',
                    lastModified: 0,
                }),
            ]}
        />
    );
}
