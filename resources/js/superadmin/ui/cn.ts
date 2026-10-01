type ClassValue = string | false | null | undefined;

// Không có tailwind-merge: class truyền thêm được nối sau class mặc định, nên nơi
// gọi chỉ thêm utility mới, không ghi đè utility cùng thuộc tính.
export function cn(...classes: ClassValue[]): string {
    return classes.filter(Boolean).join(' ');
}
