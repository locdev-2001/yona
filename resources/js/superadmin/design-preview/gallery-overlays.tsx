import { AppointmentModalDemo } from './form-preview';
import { previewCopy } from './copy';
import { Bell, Check, Copy, Ellipsis, Filter, Info, Keyboard, Pencil, Search, Trash2, X } from '@admin/components/icons';
import { useState } from 'react';
import { toast, Toaster } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@admin/components/ui/dialog';
import { ConnectionDrawerDemo } from './drawer-preview';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@admin/components/ui/dropdown-menu';
import {
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverTitle,
    PopoverTrigger,
} from '@admin/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@admin/components/ui/tooltip';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@admin/components/ui/command';
import { Input } from '@admin/components/ui/input';
import { PreviewButton } from './components';

export function DialogDemo() {
    return <AppointmentModalDemo />;
}

export function ConfirmationDemo() {
    const [open, setOpen] = useState(false);
    return (
        <>
            <PreviewButton className="catalogue-danger-button" onClick={() => setOpen(true)}>
                <Trash2 />
                {previewCopy.thu_xac_nhan_xoa}
            </PreviewButton>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent showCloseButton={false} className="catalogue-overlay">
                    <DialogHeader>
                        <DialogTitle>{previewCopy.xoa_muc_minh_hoa}</DialogTitle>
                        <DialogDescription>
                            {previewCopy.day_la_trang_thai_xac_nhan_trong_thu_vien_component}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <PreviewButton onClick={() => setOpen(false)}>{previewCopy.giu_lai}</PreviewButton>
                        <PreviewButton
                            className="catalogue-danger-button"
                            onClick={() => {
                                setOpen(false);
                                toast.success(previewCopy.da_xac_nhan_thao_tac_minh_hoa);
                            }}
                        >
                            {previewCopy.xac_nhan_minh_hoa}
                        </PreviewButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export function SheetDemo() {
    return <ConnectionDrawerDemo />;
}

export function DropdownDemo() {
    return (
        <div className="catalogue-inline">
            <DropdownMenu>
                <DropdownMenuTrigger render={<PreviewButton />}>
                    <Ellipsis />
                    {previewCopy.hanh_dong}
                </DropdownMenuTrigger>
                <DropdownMenuContent className="catalogue-popup">
                    <DropdownMenuItem onClick={() => toast(previewCopy.da_chon_chinh_sua_minh_hoa)}>
                        <Pencil />
                        {previewCopy.chinh_sua}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast(previewCopy.da_chon_sao_chep_minh_hoa)}>
                        <Copy />
                        {previewCopy.tao_ban_sao}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        variant="destructive"
                        onClick={() => toast.warning(previewCopy.thao_tac_xoa_chi_la_minh_hoa)}
                    >
                        <Trash2 />
                        {previewCopy.xoa_muc}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <span className="catalogue-hint">{previewCopy.menu_theo_ngu_canh_co_hanh_dong_nguy_hiem}</span>
        </div>
    );
}

export function PopoverDemo() {
    const [selected, setSelected] = useState('all');
    return (
        <Popover>
            <PopoverTrigger render={<PreviewButton />}>
                <Filter />
                {previewCopy.bo_loc_nhanh}
            </PopoverTrigger>
            <PopoverContent className="catalogue-popup">
                <PopoverTitle>{previewCopy.bo_loc_trang_thai}</PopoverTitle>
                <PopoverDescription>{previewCopy.chon_trang_thai_de_xem_truoc}</PopoverDescription>
                <div className="catalogue-form">
                    {[
                        { value: 'all', label: previewCopy.tat_ca_trang_thai },
                        { value: 'active', label: previewCopy.dang_hoat_dong },
                        { value: 'paused', label: previewCopy.tam_dung },
                    ].map((option) => (
                        <label className="catalogue-choice" key={option.value}>
                            <input
                                type="radio"
                                name="preview-popover-state"
                                checked={selected === option.value}
                                onChange={() => setSelected(option.value)}
                            />
                            {option.label}
                        </label>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function TooltipDemo() {
    return (
        <TooltipProvider>
            <div className="catalogue-inline">
                <Tooltip>
                    <TooltipTrigger render={<PreviewButton aria-label={previewCopy.giai_thich_chi_so} />}>
                        <Info />
                        {previewCopy.chi_so_hoat_dong}
                    </TooltipTrigger>
                    <TooltipContent>{previewCopy.nguoi_dung_co_hoat_dong_trong_ky_da_chon}</TooltipContent>
                </Tooltip>
                <span className="catalogue-hint">
                    {previewCopy.di_chuot_hoac_focus_bang_ban_phim_de_xem_giai_thich}
                </span>
            </div>
        </TooltipProvider>
    );
}

export function CommandDemo() {
    const [query, setQuery] = useState('');
    return (
        <Command className="catalogue-command">
            <div className="catalogue-command-search">
                <CommandInput
                    aria-label={previewCopy.tim_hanh_dong_minh_hoa}
                    placeholder={previewCopy.tim_hanh_dong_minh_hoa_2}
                    value={query}
                    onValueChange={setQuery}
                />
                {query && (
                    <PreviewButton
                        appearance="ghost"
                        aria-label={previewCopy.xoa_tim_hanh_dong}
                        onClick={() => setQuery('')}
                    >
                        <X />
                    </PreviewButton>
                )}
            </div>
            <CommandList>
                <CommandEmpty>{previewCopy.khong_tim_thay_hanh_dong}</CommandEmpty>
                <CommandGroup heading={previewCopy.dieu_huong_nhanh}>
                    <CommandItem onSelect={() => toast(previewCopy.da_chon_tong_quan_minh_hoa)}>
                        <Search />
                        {previewCopy.mo_tong_quan}
                    </CommandItem>
                    <CommandItem onSelect={() => toast(previewCopy.da_chon_ket_noi_minh_hoa)}>
                        <Keyboard />
                        {previewCopy.quan_ly_ket_noi}
                    </CommandItem>
                    <CommandItem onSelect={() => toast(previewCopy.da_chon_thong_bao_minh_hoa)}>
                        <Bell />
                        {previewCopy.xem_thong_bao}
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </Command>
    );
}

export function ToastDemo() {
    return (
        <div className="catalogue-inline">
            <PreviewButton
                onClick={() =>
                    toast.success(previewCopy.da_luu_thay_doi_minh_hoa, {
                        description: previewCopy.thong_bao_thanh_cong_co_the_dong,
                    })
                }
            >
                {previewCopy.thanh_cong}
            </PreviewButton>
            <PreviewButton
                onClick={() =>
                    toast.warning(previewCopy.co_ket_noi_can_kiem_tra, {
                        description: previewCopy.ban_co_the_tiep_tuc_thao_tac,
                    })
                }
            >
                {previewCopy.canh_bao}
            </PreviewButton>
            <PreviewButton
                className="catalogue-danger-button"
                onClick={() =>
                    toast.error(previewCopy.chua_the_hoan_tat_thao_tac_minh_hoa, {
                        action: {
                            label: previewCopy.thu_lai,
                            onClick: () => toast.success(previewCopy.da_thu_lai_minh_hoa),
                        },
                    })
                }
            >
                {previewCopy.loi_thu_lai}
            </PreviewButton>
        </div>
    );
}

export function GalleryToaster({ theme }: { theme: 'dark' | 'light' }) {
    return (
        <Toaster
            theme={theme}
            position="bottom-right"
            closeButton
            richColors
            toastOptions={{ className: 'catalogue-toast' }}
            icons={{ close: <X /> }}
        />
    );
}
