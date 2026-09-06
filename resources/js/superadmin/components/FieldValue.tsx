import { router } from '@inertiajs/react';
import { useState } from 'react';

import type {
    AssociationValue,
    HasManyValue,
    HasOneValue,
    SuperAdminField,
} from '../types';

// Port từ các partial field của Administrate: mỗi kiểu field vẽ đúng một kiểu.
export default function FieldValue({
    field,
    nested = false,
}: {
    field: SuperAdminField;
    nested?: boolean;
}) {
    switch (field.type) {
        case 'string':
            return nested ? (
                <>{String(field.value ?? '')}</>
            ) : (
                <div className="preserve-whitespace">{String(field.value ?? '')}</div>
            );
        case 'avatar_field':
            return <img src={String(field.value ?? '')} alt="" />;
        case 'secret_field':
            return <SecretField token={String(field.value ?? '')} />;
        case 'has_one':
            return <HasOne value={field.value as HasOneValue} />;
        case 'has_many':
            return <HasMany value={field.value as HasManyValue} />;
        case 'belongs_to':
        case 'belongs_to_search':
        case 'polymorphic':
            return <Association value={field.value as AssociationValue} />;
        case 'suspension_history_field':
            return <SuspensionHistory value={field.value as SuspensionEvent[]} />;
        default:
            return <>{field.value === null || field.value === undefined ? '' : String(field.value)}</>;
    }
}

type SuspensionEvent = { category?: string; reason?: string; suspended_at?: string };

function SuspensionHistory({ value }: { value: SuspensionEvent[] }) {
    if (!value || value.length === 0) {
        return <p className="text-sm text-n-slate-11">No suspension history recorded.</p>;
    }

    return (
        <ul className="text-sm text-n-slate-11 list-none p-0 m-0">
            {value.map(event => (
                <li key={`${event.suspended_at}-${event.category}`}>
                    <span className="font-medium">{event.category}</span> — {event.reason}
                    {event.suspended_at ? ` (${event.suspended_at})` : ''}
                </li>
            ))}
        </ul>
    );
}

function Association({ value }: { value: AssociationValue }) {
    if (!value) {
        return null;
    }

    return value.url ? <a href={value.url}>{value.label}</a> : <>{value.label}</>;
}

function HasOne({ value }: { value: HasOneValue }) {
    if (!value) {
        return null;
    }

    return (
        <fieldset className="attribute--nested">
            <legend>{value.url ? <a href={value.url}>{value.label}</a> : value.label}</legend>
            <fieldset className="">
                {value.fields.map(field => (
                    <div key={field.name}>
                        <dt className="attribute-label">{field.label}</dt>
                        <dd className={`attribute-data attribute-data--${field.html_class}`}>
                            <FieldValue field={field} nested />
                        </dd>
                    </div>
                ))}
            </fieldset>
        </fieldset>
    );
}

function HasMany({ value }: { value: HasManyValue }) {
    if (!value || value.rows.length === 0) {
        return null;
    }

    return (
        <table>
            <thead>
                <tr>
                    {value.columns.map(column => (
                        <th
                            key={column.name}
                            className={`cell-label cell-label--${column.html_class} cell-label--false`}
                            scope="col"
                            role="columnheader"
                            aria-sort="none"
                        >
                            {column.label}
                        </th>
                    ))}
                    <th scope="col" />
                </tr>
            </thead>
            <tbody>
                {value.rows.map(row => (
                    <tr className="js-table-row" key={row.url ?? ''} tabIndex={0}>
                        {row.cells.map(cell => (
                            <td key={cell.name} className={`cell-data cell-data--${cell.html_class}`}>
                                {row.url ? (
                                    <a href={row.url} className="action-show">
                                        <FieldValue field={cell} nested />
                                    </a>
                                ) : (
                                    <FieldValue field={cell} nested />
                                )}
                            </td>
                        ))}
                        <td>
                            {row.destroy_url ? (
                                <a
                                    className="text-color-red"
                                    href="#"
                                    onClick={event => {
                                        event.preventDefault();

                                        if (window.confirm('Are you sure?')) {
                                            router.delete(row.destroy_url as string);
                                        }
                                    }}
                                >
                                    Destroy
                                </a>
                            ) : null}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function SecretField({ token }: { token: string }) {
    const [revealed, setRevealed] = useState(false);

    return (
        <div className="cell-data__secret-field">
            <span data-secret-masked={!revealed}>{revealed ? token : ''}</span>
            <button type="button" onClick={() => setRevealed(current => !current)}>
                <svg width="20" height="20">
                    <use xlinkHref="#eye-show" />
                </svg>
            </button>
            <button type="button" onClick={() => navigator.clipboard?.writeText(token)}>
                <svg width="20" height="20">
                    <use xlinkHref="#icon-copy" />
                </svg>
            </button>
        </div>
    );
}
