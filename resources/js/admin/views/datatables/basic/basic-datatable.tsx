import type { ListTableProps } from '../list/list-table';
import { ListTable } from '../list/list-table';
export default function DataTableBasic<TRecord>(props: ListTableProps<TRecord>) {
    return <ListTable {...props} />;
}
