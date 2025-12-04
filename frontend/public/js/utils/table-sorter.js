/**
 * Table Sorter Utility
 * Adds sorting functionality to tables with sortable column headers
 * 
 * Usage:
 * 1. Add class "sortable" to <th> elements that should be sortable
 * 2. Add class "desc" or "asc" to set initial sort direction (optional)
 * 3. Include this script in your page
 * 4. Call: TableSorter.init('table-selector') or TableSorter.initAll()
 */

class TableSorter {
  constructor(tableElement) {
    this.table = tableElement;
    this.tbody = tableElement.querySelector('tbody');
    this.headers = Array.from(tableElement.querySelectorAll('th.sortable'));
    this.currentSort = { column: -1, direction: 'asc' };
    
    this.init();
  }

  init() {
    if (!this.tbody || this.headers.length === 0) {
      console.warn('[TableSorter] No sortable headers or tbody found');
      return;
    }

    // Attach click handlers to sortable headers
    this.headers.forEach((header, index) => {
      header.style.cursor = 'pointer';
      header.style.userSelect = 'none';
      
      // Check for initial sort state
      if (header.classList.contains('desc')) {
        this.currentSort = { column: index, direction: 'desc' };
      } else if (header.classList.contains('asc')) {
        this.currentSort = { column: index, direction: 'asc' };
      }
      
      header.addEventListener('click', () => this.handleSort(index, header));
    });

    // Apply initial sort if set
    if (this.currentSort.column !== -1) {
      const initialHeader = this.headers[this.currentSort.column];
      this.sortTable(this.currentSort.column, this.currentSort.direction);
      this.updateHeaderClasses(initialHeader, this.currentSort.direction);
    }
  }

  handleSort(columnIndex, header) {
    // Determine sort direction
    let direction = 'asc';
    
    if (this.currentSort.column === columnIndex) {
      // Toggle direction if clicking same column
      direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      // Default to ascending for new column
      direction = 'asc';
    }

    this.currentSort = { column: columnIndex, direction };
    
    // Clear all header classes
    this.headers.forEach(h => {
      h.classList.remove('asc', 'desc');
    });
    
    // Update clicked header
    this.updateHeaderClasses(header, direction);
    
    // Sort the table
    this.sortTable(columnIndex, direction);
  }

  updateHeaderClasses(header, direction) {
    header.classList.add(direction);
  }

  sortTable(columnIndex, direction) {
    const rows = Array.from(this.tbody.querySelectorAll('tr'));
    
    if (rows.length === 0) {
      return;
    }

    // Get the actual column index in the row (accounting for the header structure)
    const headerCells = Array.from(this.table.querySelectorAll('th'));
    const actualColumnIndex = headerCells.indexOf(this.headers[columnIndex]);

    rows.sort((rowA, rowB) => {
      const cellA = rowA.cells[actualColumnIndex];
      const cellB = rowB.cells[actualColumnIndex];
      
      if (!cellA || !cellB) {
        return 0;
      }

      const valueA = this.getCellValue(cellA);
      const valueB = this.getCellValue(cellB);

      // Compare values
      let comparison = 0;
      
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        comparison = valueA - valueB;
      } else {
        comparison = String(valueA).localeCompare(String(valueB), undefined, {
          numeric: true,
          sensitivity: 'base'
        });
      }

      return direction === 'asc' ? comparison : -comparison;
    });

    // Re-append rows in sorted order
    rows.forEach(row => this.tbody.appendChild(row));
    
    // Update position numbers if first column is "Position"
    this.updatePositionColumn();
  }

  getCellValue(cell) {
    const text = cell.textContent.trim();
    
    // Remove percentage signs and convert to number
    if (text.endsWith('%')) {
      const num = parseFloat(text.replace('%', ''));
      return isNaN(num) ? text : num;
    }
    
    // Try to parse as number
    const num = parseFloat(text.replace(/,/g, ''));
    if (!isNaN(num)) {
      return num;
    }
    
    return text;
  }

  updatePositionColumn() {
    const firstHeader = this.table.querySelector('th');
    if (!firstHeader || !firstHeader.textContent.toLowerCase().includes('position')) {
      return;
    }

    const rows = this.tbody.querySelectorAll('tr');
    rows.forEach((row, index) => {
      const firstCell = row.cells[0];
      if (firstCell) {
        firstCell.textContent = index + 1;
      }
    });
  }

  // Static methods for easy initialization
  static init(selector) {
    const table = document.querySelector(selector);
    if (table) {
      return new TableSorter(table);
    } else {
      console.warn(`[TableSorter] Table not found: ${selector}`);
      return null;
    }
  }

  static initAll(selector = '.table') {
    const tables = document.querySelectorAll(selector);
    const sorters = [];
    
    tables.forEach(table => {
      sorters.push(new TableSorter(table));
    });
    
    return sorters;
  }
}

// Auto-initialize on DOM ready if enabled
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.TABLE_SORTER_AUTO_INIT !== false) {
      TableSorter.initAll();
    }
  });
} else {
  if (window.TABLE_SORTER_AUTO_INIT !== false) {
    TableSorter.initAll();
  }
}

// Export for use in modules or manual initialization
if (typeof window !== 'undefined') {
  window.TableSorter = TableSorter;
}
