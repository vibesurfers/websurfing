# Comprehensive Sheet Class for Tiptap Tables

This document provides a complete TypeScript implementation of a Sheet class for managing Tiptap tables with full functionality for creating, manipulating, and persisting table data.

## Complete TypeScript Implementation

```typescript
import { Editor } from '@tiptap/core';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { Transaction } from 'prosemirror-state';

/**
 * Type definitions for the Sheet class
 */
export interface CellPosition {
  row: number;
  col: number;
}

export interface CellData {
  content: string;
  attrs?: Record<string, any>;
  type?: 'header' | 'data';
}

export interface TableData {
  rows: CellData[][];
  meta?: {
    caption?: string;
    colWidths?: number[];
    rowHeaders?: boolean;
    colHeaders?: boolean;
  };
}

export interface SheetOptions {
  defaultRows?: number;
  defaultCols?: number;
  allowResize?: boolean;
  enablePersistence?: boolean;
  persistenceKey?: string;
}

export interface CellRange {
  from: CellPosition;
  to: CellPosition;
}

export type CellValidator = (content: string, position: CellPosition) => boolean | string;

/**
 * Custom errors for Sheet operations
 */
export class SheetError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SheetError';
  }
}

export class CellNotFoundError extends SheetError {
  constructor(position: CellPosition) {
    super(`Cell not found at position (${position.row}, ${position.col})`, 'CELL_NOT_FOUND');
  }
}

export class InvalidRangeError extends SheetError {
  constructor(range: CellRange) {
    super(`Invalid range: (${range.from.row},${range.from.col}) to (${range.to.row},${range.to.col})`, 'INVALID_RANGE');
  }
}

/**
 * Comprehensive Sheet class for managing Tiptap tables
 *
 * This class provides a high-level interface for creating and manipulating
 * tables within a Tiptap editor instance. It includes methods for cell access,
 * row/column operations, data import/export, and persistence utilities.
 *
 * @example
 * ```typescript
 * const editor = new Editor({ ... });
 * const sheet = new Sheet(editor, {
 *   defaultRows: 5,
 *   defaultCols: 5,
 *   enablePersistence: true,
 *   persistenceKey: 'my-table-data'
 * });
 *
 * // Create a new table
 * sheet.createTable(3, 4);
 *
 * // Set cell content
 * sheet.setCell({ row: 0, col: 0 }, { content: 'Header 1', type: 'header' });
 *
 * // Export data
 * const data = sheet.exportData();
 * ```
 */
export class Sheet {
  private editor: Editor;
  private options: Required<SheetOptions>;
  private validators: Map<string, CellValidator> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  /**
   * Creates a new Sheet instance
   *
   * @param editor - The Tiptap editor instance
   * @param options - Configuration options for the sheet
   */
  constructor(editor: Editor, options: SheetOptions = {}) {
    this.editor = editor;
    this.options = {
      defaultRows: options.defaultRows ?? 3,
      defaultCols: options.defaultCols ?? 3,
      allowResize: options.allowResize ?? true,
      enablePersistence: options.enablePersistence ?? false,
      persistenceKey: options.persistenceKey ?? 'tiptap-sheet-data'
    };

    this.initializeEventHandlers();

    if (this.options.enablePersistence) {
      this.loadPersistedData();
    }
  }

  /**
   * Creates a new table in the editor
   *
   * @param rows - Number of rows to create
   * @param cols - Number of columns to create
   * @param withHeaderRow - Whether to include a header row
   * @returns Promise that resolves when table is created
   *
   * @example
   * ```typescript
   * await sheet.createTable(4, 5, true);
   * ```
   */
  public async createTable(
    rows: number = this.options.defaultRows,
    cols: number = this.options.defaultCols,
    withHeaderRow: boolean = false
  ): Promise<void> {
    try {
      const tableHTML = this.generateTableHTML(rows, cols, withHeaderRow);

      this.editor.chain().focus().insertContent(tableHTML).run();

      this.emit('table:created', { rows, cols, withHeaderRow });

      if (this.options.enablePersistence) {
        await this.persistData();
      }
    } catch (error) {
      throw new SheetError(`Failed to create table: ${error.message}`, 'CREATE_FAILED');
    }
  }

  /**
   * Gets the content of a specific cell
   *
   * @param position - The position of the cell to retrieve
   * @returns The cell data or null if not found
   *
   * @example
   * ```typescript
   * const cellData = sheet.getCell({ row: 1, col: 2 });
   * if (cellData) {
   *   console.log(cellData.content);
   * }
   * ```
   */
  public getCell(position: CellPosition): CellData | null {
    try {
      this.validatePosition(position);

      const table = this.findCurrentTable();
      if (!table) return null;

      const cell = this.findCellAtPosition(table, position);
      if (!cell) return null;

      return {
        content: cell.textContent || '',
        attrs: cell.node.attrs,
        type: this.determineCellType(cell.node, position.row)
      };
    } catch (error) {
      if (error instanceof SheetError) throw error;
      throw new SheetError(`Failed to get cell: ${error.message}`, 'GET_CELL_FAILED');
    }
  }

  /**
   * Sets the content of a specific cell
   *
   * @param position - The position of the cell to update
   * @param data - The data to set in the cell
   * @returns Promise that resolves when cell is updated
   *
   * @example
   * ```typescript
   * await sheet.setCell(
   *   { row: 0, col: 0 },
   *   { content: 'Updated Content', type: 'header' }
   * );
   * ```
   */
  public async setCell(position: CellPosition, data: CellData): Promise<void> {
    try {
      this.validatePosition(position);
      this.validateCellData(data, position);

      const table = this.findCurrentTable();
      if (!table) {
        throw new SheetError('No table found in current selection', 'NO_TABLE');
      }

      const success = this.updateCellContent(table, position, data);
      if (!success) {
        throw new CellNotFoundError(position);
      }

      this.emit('cell:updated', { position, data });

      if (this.options.enablePersistence) {
        await this.persistData();
      }
    } catch (error) {
      if (error instanceof SheetError) throw error;
      throw new SheetError(`Failed to set cell: ${error.message}`, 'SET_CELL_FAILED');
    }
  }

  /**
   * Gets content for a range of cells
   *
   * @param range - The range of cells to retrieve
   * @returns 2D array of cell data
   *
   * @example
   * ```typescript
   * const data = sheet.getCellRange({
   *   from: { row: 0, col: 0 },
   *   to: { row: 2, col: 2 }
   * });
   * ```
   */
  public getCellRange(range: CellRange): CellData[][] {
    this.validateRange(range);

    const result: CellData[][] = [];

    for (let row = range.from.row; row <= range.to.row; row++) {
      const rowData: CellData[] = [];
      for (let col = range.from.col; col <= range.to.col; col++) {
        const cellData = this.getCell({ row, col });
        rowData.push(cellData || { content: '', type: 'data' });
      }
      result.push(rowData);
    }

    return result;
  }

  /**
   * Sets content for a range of cells
   *
   * @param range - The range of cells to update
   * @param data - 2D array of cell data to set
   * @returns Promise that resolves when all cells are updated
   */
  public async setCellRange(range: CellRange, data: CellData[][]): Promise<void> {
    this.validateRange(range);

    const promises: Promise<void>[] = [];

    for (let row = range.from.row; row <= range.to.row; row++) {
      for (let col = range.from.col; col <= range.to.col; col++) {
        const dataRow = row - range.from.row;
        const dataCol = col - range.from.col;

        if (data[dataRow] && data[dataRow][dataCol]) {
          promises.push(this.setCell({ row, col }, data[dataRow][dataCol]));
        }
      }
    }

    await Promise.all(promises);
  }

  /**
   * Adds a new row to the table
   *
   * @param index - The index where to insert the row (default: end of table)
   * @param isHeader - Whether the new row should be a header row
   * @returns Promise that resolves when row is added
   *
   * @example
   * ```typescript
   * // Add row at the end
   * await sheet.addRow();
   *
   * // Add row at specific position
   * await sheet.addRow(2);
   * ```
   */
  public async addRow(index?: number, isHeader: boolean = false): Promise<void> {
    try {
      const table = this.findCurrentTable();
      if (!table) {
        throw new SheetError('No table found', 'NO_TABLE');
      }

      if (index !== undefined) {
        this.editor.chain().focus().addRowAt(index).run();
      } else {
        this.editor.chain().focus().addRowAfter().run();
      }

      this.emit('row:added', { index, isHeader });

      if (this.options.enablePersistence) {
        await this.persistData();
      }
    } catch (error) {
      throw new SheetError(`Failed to add row: ${error.message}`, 'ADD_ROW_FAILED');
    }
  }

  /**
   * Deletes a row from the table
   *
   * @param index - The index of the row to delete
   * @returns Promise that resolves when row is deleted
   *
   * @example
   * ```typescript
   * await sheet.deleteRow(1);
   * ```
   */
  public async deleteRow(index: number): Promise<void> {
    try {
      const table = this.findCurrentTable();
      if (!table) {
        throw new SheetError('No table found', 'NO_TABLE');
      }

      // Position cursor in the target row first
      const targetCell = this.findCellAtPosition(table, { row: index, col: 0 });
      if (!targetCell) {
        throw new SheetError(`Row ${index} not found`, 'ROW_NOT_FOUND');
      }

      this.editor.chain().focus().deleteRow().run();

      this.emit('row:deleted', { index });

      if (this.options.enablePersistence) {
        await this.persistData();
      }
    } catch (error) {
      throw new SheetError(`Failed to delete row: ${error.message}`, 'DELETE_ROW_FAILED');
    }
  }

  /**
   * Adds a new column to the table
   *
   * @param index - The index where to insert the column (default: end of table)
   * @returns Promise that resolves when column is added
   *
   * @example
   * ```typescript
   * // Add column at the end
   * await sheet.addColumn();
   *
   * // Add column at specific position
   * await sheet.addColumn(2);
   * ```
   */
  public async addColumn(index?: number): Promise<void> {
    try {
      const table = this.findCurrentTable();
      if (!table) {
        throw new SheetError('No table found', 'NO_TABLE');
      }

      if (index !== undefined) {
        this.editor.chain().focus().addColumnAt(index).run();
      } else {
        this.editor.chain().focus().addColumnAfter().run();
      }

      this.emit('column:added', { index });

      if (this.options.enablePersistence) {
        await this.persistData();
      }
    } catch (error) {
      throw new SheetError(`Failed to add column: ${error.message}`, 'ADD_COLUMN_FAILED');
    }
  }

  /**
   * Deletes a column from the table
   *
   * @param index - The index of the column to delete
   * @returns Promise that resolves when column is deleted
   *
   * @example
   * ```typescript
   * await sheet.deleteColumn(1);
   * ```
   */
  public async deleteColumn(index: number): Promise<void> {
    try {
      const table = this.findCurrentTable();
      if (!table) {
        throw new SheetError('No table found', 'NO_TABLE');
      }

      // Position cursor in the target column first
      const targetCell = this.findCellAtPosition(table, { row: 0, col: index });
      if (!targetCell) {
        throw new SheetError(`Column ${index} not found`, 'COLUMN_NOT_FOUND');
      }

      this.editor.chain().focus().deleteColumn().run();

      this.emit('column:deleted', { index });

      if (this.options.enablePersistence) {
        await this.persistData();
      }
    } catch (error) {
      throw new SheetError(`Failed to delete column: ${error.message}`, 'DELETE_COLUMN_FAILED');
    }
  }

  /**
   * Moves a row to a new position
   *
   * @param fromIndex - The current index of the row
   * @param toIndex - The target index for the row
   * @returns Promise that resolves when row is moved
   */
  public async moveRow(fromIndex: number, toIndex: number): Promise<void> {
    try {
      if (fromIndex === toIndex) return;

      const table = this.findCurrentTable();
      if (!table) {
        throw new SheetError('No table found', 'NO_TABLE');
      }

      // Get the row data before moving
      const rowData: CellData[] = [];
      const tableInfo = this.getTableInfo(table);

      for (let col = 0; col < tableInfo.cols; col++) {
        const cellData = this.getCell({ row: fromIndex, col });
        rowData.push(cellData || { content: '', type: 'data' });
      }

      // Delete the source row
      await this.deleteRow(fromIndex);

      // Add new row at target position
      const insertIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
      await this.addRow(insertIndex);

      // Restore the row data
      for (let col = 0; col < rowData.length; col++) {
        await this.setCell({ row: insertIndex, col }, rowData[col]);
      }

      this.emit('row:moved', { fromIndex, toIndex });

      if (this.options.enablePersistence) {
        await this.persistData();
      }
    } catch (error) {
      throw new SheetError(`Failed to move row: ${error.message}`, 'MOVE_ROW_FAILED');
    }
  }

  /**
   * Moves a column to a new position
   *
   * @param fromIndex - The current index of the column
   * @param toIndex - The target index for the column
   * @returns Promise that resolves when column is moved
   */
  public async moveColumn(fromIndex: number, toIndex: number): Promise<void> {
    try {
      if (fromIndex === toIndex) return;

      const table = this.findCurrentTable();
      if (!table) {
        throw new SheetError('No table found', 'NO_TABLE');
      }

      // Get the column data before moving
      const colData: CellData[] = [];
      const tableInfo = this.getTableInfo(table);

      for (let row = 0; row < tableInfo.rows; row++) {
        const cellData = this.getCell({ row, col: fromIndex });
        colData.push(cellData || { content: '', type: 'data' });
      }

      // Delete the source column
      await this.deleteColumn(fromIndex);

      // Add new column at target position
      const insertIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
      await this.addColumn(insertIndex);

      // Restore the column data
      for (let row = 0; row < colData.length; row++) {
        await this.setCell({ row, col: insertIndex }, colData[row]);
      }

      this.emit('column:moved', { fromIndex, toIndex });

      if (this.options.enablePersistence) {
        await this.persistData();
      }
    } catch (error) {
      throw new SheetError(`Failed to move column: ${error.message}`, 'MOVE_COLUMN_FAILED');
    }
  }

  /**
   * Exports the current table data
   *
   * @returns The complete table data structure
   *
   * @example
   * ```typescript
   * const data = sheet.exportData();
   * console.log(`Table has ${data.rows.length} rows`);
   * ```
   */
  public exportData(): TableData | null {
    try {
      const table = this.findCurrentTable();
      if (!table) return null;

      const tableInfo = this.getTableInfo(table);
      const rows: CellData[][] = [];

      for (let row = 0; row < tableInfo.rows; row++) {
        const rowData: CellData[] = [];
        for (let col = 0; col < tableInfo.cols; col++) {
          const cellData = this.getCell({ row, col });
          rowData.push(cellData || { content: '', type: 'data' });
        }
        rows.push(rowData);
      }

      return {
        rows,
        meta: {
          caption: table.node.attrs.caption,
          colWidths: table.node.attrs.colWidths,
          rowHeaders: tableInfo.hasRowHeaders,
          colHeaders: tableInfo.hasColHeaders
        }
      };
    } catch (error) {
      throw new SheetError(`Failed to export data: ${error.message}`, 'EXPORT_FAILED');
    }
  }

  /**
   * Imports data into the current table
   *
   * @param data - The table data to import
   * @param replaceExisting - Whether to replace existing table or merge
   * @returns Promise that resolves when data is imported
   *
   * @example
   * ```typescript
   * const data = {
   *   rows: [
   *     [{ content: 'Name', type: 'header' }, { content: 'Age', type: 'header' }],
   *     [{ content: 'John', type: 'data' }, { content: '25', type: 'data' }]
   *   ]
   * };
   * await sheet.importData(data);
   * ```
   */
  public async importData(data: TableData, replaceExisting: boolean = true): Promise<void> {
    try {
      if (!data.rows || data.rows.length === 0) {
        throw new SheetError('No data provided for import', 'NO_IMPORT_DATA');
      }

      if (replaceExisting) {
        // Create a new table with the imported data
        await this.createTable(data.rows.length, data.rows[0].length);
      }

      // Set all cell data
      for (let row = 0; row < data.rows.length; row++) {
        for (let col = 0; col < data.rows[row].length; col++) {
          const cellData = data.rows[row][col];
          if (cellData) {
            await this.setCell({ row, col }, cellData);
          }
        }
      }

      this.emit('data:imported', { data, replaceExisting });

      if (this.options.enablePersistence) {
        await this.persistData();
      }
    } catch (error) {
      throw new SheetError(`Failed to import data: ${error.message}`, 'IMPORT_FAILED');
    }
  }

  /**
   * Exports table data to CSV format
   *
   * @param includeHeaders - Whether to include header row
   * @returns CSV string
   *
   * @example
   * ```typescript
   * const csv = sheet.exportToCSV();
   * const blob = new Blob([csv], { type: 'text/csv' });
   * ```
   */
  public exportToCSV(includeHeaders: boolean = true): string {
    const data = this.exportData();
    if (!data) return '';

    const csvRows: string[] = [];

    for (const row of data.rows) {
      const csvCells = row.map(cell => {
        // Escape quotes and wrap in quotes if necessary
        const content = cell.content.replace(/"/g, '""');
        return content.includes(',') || content.includes('"') || content.includes('\n')
          ? `"${content}"`
          : content;
      });
      csvRows.push(csvCells.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Imports data from CSV format
   *
   * @param csv - CSV string to import
   * @param hasHeaders - Whether the CSV includes headers
   * @returns Promise that resolves when CSV is imported
   *
   * @example
   * ```typescript
   * const csvData = 'Name,Age\nJohn,25\nJane,30';
   * await sheet.importFromCSV(csvData, true);
   * ```
   */
  public async importFromCSV(csv: string, hasHeaders: boolean = true): Promise<void> {
    try {
      const rows = this.parseCSV(csv);
      if (rows.length === 0) {
        throw new SheetError('No data found in CSV', 'EMPTY_CSV');
      }

      const tableData: TableData = {
        rows: rows.map((row, rowIndex) =>
          row.map(cell => ({
            content: cell,
            type: (hasHeaders && rowIndex === 0) ? 'header' as const : 'data' as const
          }))
        )
      };

      await this.importData(tableData);
    } catch (error) {
      throw new SheetError(`Failed to import CSV: ${error.message}`, 'CSV_IMPORT_FAILED');
    }
  }

  /**
   * Adds a validator for cell content
   *
   * @param name - Name of the validator
   * @param validator - Validation function
   *
   * @example
   * ```typescript
   * sheet.addValidator('number', (content, position) => {
   *   return !isNaN(Number(content)) || 'Must be a valid number';
   * });
   * ```
   */
  public addValidator(name: string, validator: CellValidator): void {
    this.validators.set(name, validator);
  }

  /**
   * Removes a validator
   *
   * @param name - Name of the validator to remove
   */
  public removeValidator(name: string): void {
    this.validators.delete(name);
  }

  /**
   * Validates a cell using all registered validators
   *
   * @param content - Cell content to validate
   * @param position - Position of the cell
   * @returns Array of validation error messages (empty if valid)
   */
  public validateCell(content: string, position: CellPosition): string[] {
    const errors: string[] = [];

    for (const [name, validator] of this.validators) {
      const result = validator(content, position);
      if (result !== true) {
        errors.push(typeof result === 'string' ? result : `Validation failed: ${name}`);
      }
    }

    return errors;
  }

  /**
   * Adds an event listener
   *
   * @param event - Event name
   * @param callback - Callback function
   *
   * @example
   * ```typescript
   * sheet.on('cell:updated', (data) => {
   *   console.log('Cell updated:', data);
   * });
   * ```
   */
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Removes an event listener
   *
   * @param event - Event name
   * @param callback - Callback function to remove
   */
  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Gets information about the current table
   *
   * @returns Table information or null if no table found
   */
  public getTableInfo(): { rows: number; cols: number; hasRowHeaders: boolean; hasColHeaders: boolean } | null {
    const table = this.findCurrentTable();
    if (!table) return null;

    return this.getTableInfo(table);
  }

  /**
   * Clears all content from the table while preserving structure
   *
   * @returns Promise that resolves when table is cleared
   */
  public async clearTable(): Promise<void> {
    try {
      const table = this.findCurrentTable();
      if (!table) {
        throw new SheetError('No table found', 'NO_TABLE');
      }

      const tableInfo = this.getTableInfo(table);

      for (let row = 0; row < tableInfo.rows; row++) {
        for (let col = 0; col < tableInfo.cols; col++) {
          await this.setCell({ row, col }, { content: '', type: 'data' });
        }
      }

      this.emit('table:cleared');

      if (this.options.enablePersistence) {
        await this.persistData();
      }
    } catch (error) {
      throw new SheetError(`Failed to clear table: ${error.message}`, 'CLEAR_FAILED');
    }
  }

  /**
   * Persists the current table data to storage
   *
   * @returns Promise that resolves when data is persisted
   */
  public async persistData(): Promise<void> {
    if (!this.options.enablePersistence) return;

    try {
      const data = this.exportData();
      if (data) {
        localStorage.setItem(this.options.persistenceKey, JSON.stringify(data));
        this.emit('data:persisted', { data });
      }
    } catch (error) {
      throw new SheetError(`Failed to persist data: ${error.message}`, 'PERSIST_FAILED');
    }
  }

  /**
   * Loads persisted data from storage
   *
   * @returns Promise that resolves when data is loaded
   */
  public async loadPersistedData(): Promise<void> {
    if (!this.options.enablePersistence) return;

    try {
      const stored = localStorage.getItem(this.options.persistenceKey);
      if (stored) {
        const data: TableData = JSON.parse(stored);
        await this.importData(data, false);
        this.emit('data:loaded', { data });
      }
    } catch (error) {
      throw new SheetError(`Failed to load persisted data: ${error.message}`, 'LOAD_FAILED');
    }
  }

  /**
   * Clears persisted data from storage
   */
  public clearPersistedData(): void {
    if (!this.options.enablePersistence) return;

    localStorage.removeItem(this.options.persistenceKey);
    this.emit('data:cleared');
  }

  // Private helper methods

  private initializeEventHandlers(): void {
    // Set up any needed editor event handlers
    this.editor.on('transaction', (props) => {
      if (this.options.enablePersistence) {
        // Debounced persistence
        this.debouncedPersist();
      }
    });
  }

  private debouncedPersist = this.debounce(async () => {
    await this.persistData();
  }, 1000);

  private debounce(func: Function, wait: number): Function {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  private validatePosition(position: CellPosition): void {
    if (position.row < 0 || position.col < 0) {
      throw new SheetError('Position cannot be negative', 'INVALID_POSITION');
    }
  }

  private validateRange(range: CellRange): void {
    this.validatePosition(range.from);
    this.validatePosition(range.to);

    if (range.from.row > range.to.row || range.from.col > range.to.col) {
      throw new InvalidRangeError(range);
    }
  }

  private validateCellData(data: CellData, position: CellPosition): void {
    const errors = this.validateCell(data.content, position);
    if (errors.length > 0) {
      throw new SheetError(`Cell validation failed: ${errors.join(', ')}`, 'VALIDATION_FAILED');
    }
  }

  private generateTableHTML(rows: number, cols: number, withHeaderRow: boolean): string {
    let html = '<table>';

    for (let row = 0; row < rows; row++) {
      html += '<tr>';
      for (let col = 0; col < cols; col++) {
        const tag = withHeaderRow && row === 0 ? 'th' : 'td';
        html += `<${tag}></${tag}>`;
      }
      html += '</tr>';
    }

    html += '</table>';
    return html;
  }

  private findCurrentTable(): { node: ProseMirrorNode; pos: number } | null {
    const { state } = this.editor;
    const { selection } = state;

    let table = null;
    state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
      if (node.type.name === 'table' && !table) {
        table = { node, pos };
        return false;
      }
    });

    return table;
  }

  private findCellAtPosition(
    table: { node: ProseMirrorNode; pos: number },
    position: CellPosition
  ): { node: ProseMirrorNode; pos: number } | null {
    let currentRow = 0;
    let currentCol = 0;
    let result = null;

    table.node.forEach((row, rowOffset) => {
      if (currentRow === position.row) {
        row.forEach((cell, cellOffset) => {
          if (currentCol === position.col) {
            result = { node: cell, pos: table.pos + 1 + rowOffset + cellOffset };
            return false;
          }
          currentCol++;
        });
        return false;
      }
      currentRow++;
      currentCol = 0;
    });

    return result;
  }

  private updateCellContent(
    table: { node: ProseMirrorNode; pos: number },
    position: CellPosition,
    data: CellData
  ): boolean {
    const cell = this.findCellAtPosition(table, position);
    if (!cell) return false;

    const tr = this.editor.state.tr;
    const cellContent = tr.doc.resolve(cell.pos + 1);

    tr.insertText(data.content, cellContent.pos, cellContent.pos + cell.node.content.size);

    this.editor.view.dispatch(tr);
    return true;
  }

  private determineCellType(node: ProseMirrorNode, rowIndex: number): 'header' | 'data' {
    return node.type.name === 'tableHeader' || rowIndex === 0 ? 'header' : 'data';
  }

  private getTableInfo(table: { node: ProseMirrorNode; pos: number }): {
    rows: number;
    cols: number;
    hasRowHeaders: boolean;
    hasColHeaders: boolean;
  } {
    let rows = 0;
    let cols = 0;
    let hasRowHeaders = false;
    let hasColHeaders = false;

    table.node.forEach((row) => {
      rows++;
      let rowCols = 0;
      row.forEach((cell) => {
        rowCols++;
        if (cell.type.name === 'tableHeader') {
          if (rows === 1) hasColHeaders = true;
          if (rowCols === 1) hasRowHeaders = true;
        }
      });
      if (rowCols > cols) cols = rowCols;
    });

    return { rows, cols, hasRowHeaders, hasColHeaders };
  }

  private parseCSV(csv: string): string[][] {
    const rows: string[][] = [];
    const lines = csv.split('\n');

    for (const line of lines) {
      if (line.trim() === '') continue;

      const row: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++; // Skip next quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          row.push(current);
          current = '';
        } else {
          current += char;
        }
      }

      row.push(current);
      rows.push(row);
    }

    return rows;
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }
}
```

## Usage Examples

### Basic Usage

```typescript
import { Editor } from '@tiptap/core';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Sheet } from './sheet';

// Initialize editor with table extensions
const editor = new Editor({
  extensions: [
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
  ],
});

// Create sheet instance
const sheet = new Sheet(editor, {
  defaultRows: 5,
  defaultCols: 4,
  enablePersistence: true,
  persistenceKey: 'my-spreadsheet'
});

// Create a new table
await sheet.createTable(3, 4, true);

// Set header content
await sheet.setCell({ row: 0, col: 0 }, { content: 'Name', type: 'header' });
await sheet.setCell({ row: 0, col: 1 }, { content: 'Age', type: 'header' });

// Set data
await sheet.setCell({ row: 1, col: 0 }, { content: 'John Doe', type: 'data' });
await sheet.setCell({ row: 1, col: 1 }, { content: '25', type: 'data' });
```

### Data Import/Export

```typescript
// Export current table data
const tableData = sheet.exportData();
console.log('Table has', tableData.rows.length, 'rows');

// Export to CSV
const csv = sheet.exportToCSV();
const blob = new Blob([csv], { type: 'text/csv' });

// Import from CSV
const csvData = `Name,Age,City
John Doe,25,New York
Jane Smith,30,Los Angeles`;
await sheet.importFromCSV(csvData, true);

// Import structured data
const data = {
  rows: [
    [
      { content: 'Product', type: 'header' },
      { content: 'Price', type: 'header' }
    ],
    [
      { content: 'Laptop', type: 'data' },
      { content: '$999', type: 'data' }
    ]
  ]
};
await sheet.importData(data);
```

### Advanced Operations

```typescript
// Add validators
sheet.addValidator('number', (content, position) => {
  return !isNaN(Number(content)) || 'Must be a valid number';
});

sheet.addValidator('required', (content, position) => {
  return content.trim() !== '' || 'This field is required';
});

// Event handling
sheet.on('cell:updated', (data) => {
  console.log(`Cell at (${data.position.row}, ${data.position.col}) updated to: ${data.data.content}`);
});

sheet.on('table:created', (data) => {
  console.log(`Table created with ${data.rows} rows and ${data.cols} columns`);
});

// Row and column operations
await sheet.addRow(2); // Add row at index 2
await sheet.deleteRow(1); // Delete row at index 1
await sheet.moveRow(0, 2); // Move row from index 0 to index 2

await sheet.addColumn(); // Add column at end
await sheet.deleteColumn(3); // Delete column at index 3
await sheet.moveColumn(1, 0); // Move column from index 1 to index 0

// Range operations
const range = {
  from: { row: 1, col: 1 },
  to: { row: 3, col: 3 }
};

const rangeData = sheet.getCellRange(range);
console.log('Range data:', rangeData);

// Set range data
await sheet.setCellRange(range, [
  [{ content: 'A1', type: 'data' }, { content: 'B1', type: 'data' }],
  [{ content: 'A2', type: 'data' }, { content: 'B2', type: 'data' }]
]);
```

### Error Handling

```typescript
try {
  await sheet.setCell({ row: -1, col: 0 }, { content: 'Invalid', type: 'data' });
} catch (error) {
  if (error instanceof SheetError) {
    console.error('Sheet error:', error.message, 'Code:', error.code);
  }
}

try {
  const cellData = sheet.getCell({ row: 100, col: 100 });
} catch (error) {
  if (error instanceof CellNotFoundError) {
    console.error('Cell not found');
  }
}
```

## Key Features

1. **Type Safety**: Full TypeScript support with comprehensive type definitions
2. **Error Handling**: Custom error classes for different types of failures
3. **Event System**: Comprehensive event system for monitoring changes
4. **Validation**: Pluggable validation system for cell content
5. **Persistence**: Built-in data persistence with localStorage
6. **Data Formats**: Import/export support for JSON and CSV formats
7. **Range Operations**: Support for operating on cell ranges
8. **Row/Column Management**: Full CRUD operations for table structure
9. **Performance**: Debounced persistence and efficient cell access
10. **Extensibility**: Modular design allowing easy extension

## Integration Notes

This Sheet class is designed to work with any Tiptap editor instance that has table extensions enabled. It provides a high-level interface that abstracts away the complexity of working with ProseMirror's table model while maintaining full compatibility with Tiptap's table features.

The class handles all the common spreadsheet operations while maintaining the document's integrity and providing a clean API for developers to build spreadsheet-like applications on top of Tiptap.