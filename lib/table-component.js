// table-component.js - Sortable table component

export default function createTable(opts) {
  const { columns, rows, sortable = true } = opts;
  const container = document.createElement('div');
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export CSV';
  exportBtn.className = 'btn';
  exportBtn.onclick = () => exportCSV();

  container.appendChild(exportBtn);
  container.appendChild(table);
  table.appendChild(thead);
  table.appendChild(tbody);

  let sortCol = null;
  let sortAsc = true;

  function render() {
    thead.innerHTML = '';
    tbody.innerHTML = '';

    const headerRow = document.createElement('tr');
    columns.forEach((col, i) => {
      const th = document.createElement('th');
      th.textContent = col.label;
      if (sortable) {
        th.style.cursor = 'pointer';
        th.onclick = () => sortBy(i);
      }
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const displayRows = [...rows];
    if (sortCol !== null) {
      displayRows.sort((a, b) => {
        const aVal = a[columns[sortCol].key];
        const bVal = b[columns[sortCol].key];
        if (aVal < bVal) return sortAsc ? -1 : 1;
        if (aVal > bVal) return sortAsc ? 1 : -1;
        return 0;
      });
    }

    displayRows.forEach(row => {
      const tr = document.createElement('tr');
      columns.forEach(col => {
        const td = document.createElement('td');
        td.textContent = row[col.key];
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  function sortBy(colIndex) {
    if (sortCol === colIndex) {
      sortAsc = !sortAsc;
    } else {
      sortCol = colIndex;
      sortAsc = true;
    }
    render();
  }

  function exportCSV() {
    const csv = [columns.map(c => c.label).join(',')];
    rows.forEach(row => csv.push(columns.map(c => row[c.key]).join(',')));
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'table.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  container.update = (newRows) => {
    rows.splice(0, rows.length, ...newRows);
    render();
  };

  render();
  return container;
}