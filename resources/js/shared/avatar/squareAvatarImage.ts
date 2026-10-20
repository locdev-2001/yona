// Trùng AvatarContentType::ALLOWED phía máy chủ.
export const AVATAR_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const AVATAR_OUTPUT_SIDE_PX = 512;
const AVATAR_OUTPUT_TYPE = 'image/webp';
const AVATAR_OUTPUT_QUALITY = 0.9;

// Cắt vuông giữa ảnh và thu về tối đa 512px trước khi tải lên: avatar luôn hiện tròn/vuông nên
// phần thừa hai bên không bao giờ thấy. Trình duyệt không mã hoá được webp thì tự ra png.
export async function squareAvatarImage(file: Blob): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const outputSide = Math.min(side, AVATAR_OUTPUT_SIDE_PX);
    const canvas = document.createElement('canvas');
    canvas.width = outputSide;
    canvas.height = outputSide;
    canvas.getContext('2d')?.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, outputSide, outputSide);
    bitmap.close();

    return new Promise((resolve, reject) =>
        canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Could not encode avatar'))), AVATAR_OUTPUT_TYPE, AVATAR_OUTPUT_QUALITY),
    );
}
