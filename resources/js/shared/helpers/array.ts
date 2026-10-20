// Chia mảng thành các đoạn liên tiếp, mỗi đoạn tối đa `size` phần tử.
export function chunk<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, index) => array.slice(index * size, index * size + size));
}
