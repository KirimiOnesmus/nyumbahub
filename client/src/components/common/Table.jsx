const isInteractiveTarget = (target) =>
  typeof target?.closest === 'function' &&
  target.closest(
    'a, button, input, select, textarea, summary, [role="button"]',
  );

const Table = ({ columns, data, keyField = 'id', onRowClick }) => {
  if (!Array.isArray(columns) || columns.length === 0) return null;

  const rows = Array.isArray(data) ? data : [];
  const primaryColumn = columns[0];

  const renderCell = (row, column) =>
    column.render ? column.render(row) : row[column.key];

  const rowProps = (row) =>
    onRowClick
      ? {
          tabIndex: 0,
          'aria-label': `Open ${primaryColumn.label}`,
          onClick: (event) => {
            if (!isInteractiveTarget(event.target)) onRowClick(row);
          },
          onKeyDown: (event) => {
            if (
              event.target === event.currentTarget &&
              (event.key === 'Enter' || event.key === ' ')
            ) {
              event.preventDefault();
              onRowClick(row);
            }
          },
        }
      : {};

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="hidden md:table-header-group">
          <tr className="border-b border-slate-200 bg-canvas">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-500 ${
                  column.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="block space-y-3 md:table-row-group md:space-y-0 md:divide-y md:divide-slate-100">
          {rows.map((row, rowIndex) => (
            <tr
              key={row[keyField] ?? rowIndex}
              {...rowProps(row)}
              className={`block rounded-xl border border-slate-200 bg-white shadow-sm md:table-row md:rounded-none md:border-0 md:bg-transparent md:shadow-none ${
                onRowClick
                  ? 'cursor-pointer transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-700'
                  : ''
              }`}
            >
              {columns.map((column, columnIndex) => {
                const mobileDetails = column.mobileVisibility === 'expanded';
                const cellValue = renderCell(row, column);

                return (
                  <td
                    key={column.key}
                    className={`min-w-0 text-slate-700 ${
                      columnIndex === 0
                        ? 'block break-words border-b border-slate-100 px-4 py-3 font-semibold text-slate-900 md:table-cell md:border-0 md:px-6 md:py-4 md:font-normal md:text-slate-700'
                        : 'flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-0 md:table-cell md:border-0 md:px-6 md:py-4'
                    } ${column.align === 'right' ? 'md:text-right' : 'md:text-left'}`}
                  >
                    <span className="mb-1 block text-xs font-medium text-slate-500 md:hidden">
                      {column.label}
                    </span>
                    {mobileDetails ? (
                      <>
                        <details className="md:hidden">
                          <summary className="min-h-11 cursor-pointer py-2 font-semibold text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700">
                            Show {column.label.toLowerCase()}
                          </summary>
                          <div className="break-words pb-2 text-sm font-normal text-slate-800">
                            {cellValue}
                          </div>
                        </details>
                        <span className="hidden md:inline">{cellValue}</span>
                      </>
                    ) : (
                      <span className="break-words">{cellValue}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
