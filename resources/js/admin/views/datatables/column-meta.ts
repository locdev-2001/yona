import type { RowData } from '@tanstack/react-table'

// Lớp riêng cho ô tiêu đề và ô dữ liệu của từng cột (căn phải, giữ một dòng...).
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    headerClassName?: string
    cellClassName?: string
  }
}

export {}
