import { Head, router } from '@inertiajs/react';

import FieldValue from '../components/FieldValue';
import type { SuperAdminColumn, SuperAdminRow } from '../types';

type Props = {
    resource: string;
    resourceLabel: string;
    singular: string;
    singularLabel: string;
    columns: SuperAdminColumn[];
    rows: SuperAdminRow[];
    pagination: { current: number; last: number; total: number };
    filters: string[];
    search: string;
    order: string;
    direction: string;
    actions: string[];
};

const humanize = (value: string) =>
    value
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

// Port từ app/views/administrate/application/index.html.erb + _search/_filters
// của bản gốc.
export default function ResourceIndex({
    resource,
    resourceLabel,
    singular,
    singularLabel,
    columns,
    rows,
    pagination,
    filters,
    search,
    order,
    direction,
    actions,
}: Props) {
    const sortUrl = (column: string) => {
        const nextDirection = order === column && direction === 'asc' ? 'desc' : 'asc';

        return `/admin/${resource}?${singular}[direction]=${nextDirection}&${singular}[order]=${column}`;
    };

    return (
        <>
            <Head title={resourceLabel} />
            <header className="main-content__header" role="banner">
                <div className="flex items-center justify-between w-full">
                    <h1 className="main-content__page-title m-0 mr-6" id="page-title">
                        {resourceLabel}
                    </h1>

                    <div className="flex items-center">
                        <div className="flex items-center">
                            {filters.length > 0 ? (
                                <div className="flex items-center bg-gray-100 border-0 rounded-md shadow-none relative w-[260px]">
                                    <div className="flex items-center h-10 px-2 w-full">
                                        <div
                                            className="flex items-center justify-center flex-shrink-0 mr-2 text-gray-500"
                                            title="Filter by"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 h-full min-w-0 relative">
                                            <select
                                                id="filter-select"
                                                className="appearance-none bg-transparent border-0 text-gray-700 cursor-pointer text-sm h-full overflow-hidden truncate whitespace-nowrap w-full pr-7 pl-0 py-2 focus:outline-none"
                                                value={search.endsWith(':') ? search.slice(0, -1) : ''}
                                                onChange={event =>
                                                    router.get(
                                                        `/admin/${resource}`,
                                                        event.target.value
                                                            ? { search: `${event.target.value}:` }
                                                            : {},
                                                    )
                                                }
                                            >
                                                <option value="">All records</option>
                                                {filters.map(filter => (
                                                    <option value={filter} key={filter}>
                                                        {humanize(filter)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            <div className="ml-3">
                                <form className="search" role="search">
                                    <label className="search__label" htmlFor="search">
                                        <svg className="search__eyeglass-icon" role="img">
                                            <title>Search {resourceLabel}</title>
                                            <use xlinkHref="#icon-eyeglass" />
                                        </svg>
                                    </label>
                                    <input
                                        className="search__input"
                                        id="search"
                                        type="search"
                                        name="search"
                                        placeholder={`Search ${resourceLabel}`}
                                        defaultValue={search}
                                    />
                                    <a className="search__clear-link" href={`/admin/${resource}`}>
                                        <svg className="search__clear-icon" role="img">
                                            <title>Clear search</title>
                                            <use xlinkHref="#icon-cancel" />
                                        </svg>
                                    </a>
                                </form>
                            </div>
                        </div>

                        {actions.includes('new') ? (
                            <div className="whitespace-nowrap ml-4">
                                <a className="button" href={`/admin/${resource}/new`}>
                                    New {singularLabel.toLowerCase()}
                                </a>
                            </div>
                        ) : null}
                    </div>
                </div>
            </header>

            <section className="main-content__body main-content__body--flush">
                <table aria-labelledby="page-title">
                    <thead>
                        <tr>
                            {columns.map(column => (
                                <th
                                    key={column.name}
                                    className={`cell-label cell-label--${column.html_class} ${
                                        order === column.name ? `cell-label--${direction}` : 'cell-label--false'
                                    }`}
                                    scope="col"
                                    role="columnheader"
                                    aria-sort="none"
                                >
                                    <a href={sortUrl(column.name)}>
                                        {column.label}
                                        {order === column.name ? (
                                            <span
                                                className={`cell-label__sort-indicator cell-label__sort-indicator--${direction}`}
                                            >
                                                <svg aria-hidden="true">
                                                    <use xlinkHref="#icon-up-caret" />
                                                </svg>
                                            </span>
                                        ) : null}
                                    </a>
                                </th>
                            ))}
                            {actions.includes('edit') ? <th scope="col" /> : null}
                            {actions.includes('destroy') ? <th scope="col" /> : null}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => (
                            <tr className="js-table-row" key={row.url ?? ''} tabIndex={0} role="link">
                                {row.cells.map(cell => (
                                    <td key={cell.name} className={`cell-data cell-data--${cell.html_class}`}>
                                        <a href={row.url ?? '#'} className="action-show">
                                            <FieldValue field={cell} nested />
                                        </a>
                                    </td>
                                ))}
                                {actions.includes('edit') ? (
                                    <td>
                                        <a className="action-edit" href={`${row.url}/edit`}>
                                            Edit
                                        </a>
                                    </td>
                                ) : null}
                                {actions.includes('destroy') ? (
                                    <td>
                                        <a
                                            className="text-color-red"
                                            href="#"
                                            onClick={event => {
                                                event.preventDefault();

                                                if (window.confirm('Are you sure?')) {
                                                    router.delete(row.url ?? '');
                                                }
                                            }}
                                        >
                                            Destroy
                                        </a>
                                    </td>
                                ) : null}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {pagination.last > 1 ? (
                    <nav className="pagination">
                        {Array.from({ length: pagination.last }, (_, index) => index + 1).map(page => (
                            <a
                                key={page}
                                className={page === pagination.current ? 'current' : ''}
                                href={`/admin/${resource}?page=${page}`}
                            >
                                {page}
                            </a>
                        ))}
                    </nav>
                ) : null}
            </section>
        </>
    );
}
