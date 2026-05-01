import React from 'react';
import clsx from 'clsx';

export const ResponsiveTable = ({ children, className = '', wrapperClassName = '' }) => (
    <div className={clsx('w-full overflow-hidden md:overflow-x-auto', wrapperClassName)}>
        <table className={clsx('w-full border-separate border-spacing-y-3 md:min-w-full md:border-collapse md:border-spacing-0', className)}>
            {children}
        </table>
    </div>
);

export const ResponsiveTableHead = ({ children, className = '', ...props }) => (
    <thead className={clsx('hidden bg-blue-600 text-white md:table-header-group', className)} {...props}>
        {children}
    </thead>
);

export const ResponsiveTableBody = ({ children, className = '' }) => (
    <tbody className={clsx('block md:table-row-group', className)}>
        {children}
    </tbody>
);

export const ResponsiveTableRow = ({ children, className = '', as: Component = 'tr', ...props }) => (
    <Component
        className={clsx(
            'mb-3 block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:mb-0 md:table-row md:overflow-visible md:rounded-none md:border-0 md:shadow-none',
            className,
        )}
        {...props}
    >
        {children}
    </Component>
);

export const ResponsiveTableHeaderCell = ({ children, className = '', ...props }) => (
    <th
        scope="col"
        className={clsx('px-6 py-3 text-left text-xs font-bold uppercase tracking-wider', className)}
        {...props}
    >
        {children}
    </th>
);

export const ResponsiveTableCell = ({
    children,
    label,
    className = '',
    contentClassName = '',
    nowrap = false,
    ...props
}) => (
    <td
        data-label={label}
        className={clsx(
            'flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 text-right text-sm last:border-b-0 before:mr-4 before:min-w-24 before:flex-shrink-0 before:text-left before:text-xs before:font-semibold before:uppercase before:tracking-wide before:text-slate-500 before:content-[attr(data-label)] md:table-cell md:border-b-0 md:px-6 md:py-4 md:text-left md:align-middle md:before:content-none',
            nowrap && 'md:whitespace-nowrap',
            className,
        )}
        {...props}
    >
        <div className={clsx('min-w-0 flex-1 md:block', contentClassName)}>
            {children}
        </div>
    </td>
);

export const ResponsiveTableEmpty = ({ children, colSpan, className = '' }) => (
    <tr className="block md:table-row">
        <td
            colSpan={colSpan}
            className={clsx(
                'block rounded-lg border border-slate-200 bg-white px-6 py-12 text-center text-sm text-gray-500 shadow-sm md:table-cell md:rounded-none md:border-0 md:bg-transparent md:shadow-none',
                className,
            )}
        >
            {children}
        </td>
    </tr>
);
