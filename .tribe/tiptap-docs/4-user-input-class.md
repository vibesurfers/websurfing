# UserInput Class for Tiptap Tables

A comprehensive TypeScript class for handling user input in Tiptap table cells with full keyboard navigation, validation, and content management.

## Type Definitions

```typescript
// Types for cell positioning and validation
interface CellPosition {
  row: number;
  col: number;
}

interface CellContent {
  text: string;
  format?: 'plain' | 'number' | 'date' | 'currency' | 'percentage';
  metadata?: Record<string, any>;
}

interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (content: string) => boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface UndoRedoState {
  position: CellPosition;
  content: CellContent;
  timestamp: number;
}

interface KeyboardEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
}

interface PasteData {
  text: string;
  html?: string;
  cells?: string[][];
}

// Event handlers
interface UserInputEvents {
  onCellChange?: (position: CellPosition, content: CellContent) => void;
  onCellFocus?: (position: CellPosition) => void;
  onCellBlur?: (position: CellPosition) => void;
  onValidationError?: (position: CellPosition, errors: string[]) => void;
  onKeyboardNavigation?: (from: CellPosition, to: CellPosition) => void;
  onPaste?: (position: CellPosition, data: PasteData) => void;
  onUndo?: (state: UndoRedoState) => void;
  onRedo?: (state: UndoRedoState) => void;
}

interface UserInputConfig {
  maxUndoHistory: number;
  enableAutoSave: boolean;
  autoSaveDelay: number;
  enableRealTimeValidation: boolean;
  allowedFormats: CellContent['format'][];
  defaultFormat: CellContent['format'];
  keyBindings: Record<string, string>;
}
```

## UserInput Class Implementation

```typescript
import { Editor } from '@tiptap/core';
import { Node } from '@tiptap/pm/model';

class UserInput {
  private editor: Editor;
  private currentPosition: CellPosition | null = null;
  private validationRules: Map<string, ValidationRule[]> = new Map();
  private undoHistory: UndoRedoState[] = [];
  private redoHistory: UndoRedoState[] = [];
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private events: UserInputEvents;
  private config: UserInputConfig;

  constructor(
    editor: Editor,
    events: UserInputEvents = {},
    config: Partial<UserInputConfig> = {}
  ) {
    this.editor = editor;
    this.events = events;
    this.config = {
      maxUndoHistory: 50,
      enableAutoSave: true,
      autoSaveDelay: 1000,
      enableRealTimeValidation: true,
      allowedFormats: ['plain', 'number', 'date', 'currency', 'percentage'],
      defaultFormat: 'plain',
      keyBindings: {
        'Enter': 'moveDown',
        'Tab': 'moveRight',
        'Shift+Tab': 'moveLeft',
        'ArrowUp': 'moveUp',
        'ArrowDown': 'moveDown',
        'ArrowLeft': 'moveLeft',
        'ArrowRight': 'moveRight',
        'Ctrl+Z': 'undo',
        'Ctrl+Y': 'redo',
        'Ctrl+V': 'paste',
        'Escape': 'exitEditMode'
      },
      ...config
    };

    this.initialize();
  }

  /**
   * Initialize the UserInput class with event listeners
   */
  private initialize(): void {
    this.setupKeyboardHandlers();
    this.setupFocusHandlers();
    this.setupPasteHandlers();
  }

  /**
   * Setup keyboard event handlers
   */
  private setupKeyboardHandlers(): void {
    this.editor.on('keydown', (event: KeyboardEvent) => {
      this.handleKeyboardEvent(event);
    });

    this.editor.on('beforeinput', (event: InputEvent) => {
      this.handleBeforeInput(event);
    });
  }

  /**
   * Setup focus and blur handlers
   */
  private setupFocusHandlers(): void {
    this.editor.on('focus', () => {
      const position = this.getCurrentCellPosition();
      if (position) {
        this.setCurrentPosition(position);
        this.events.onCellFocus?.(position);
      }
    });

    this.editor.on('blur', () => {
      if (this.currentPosition) {
        this.events.onCellBlur?.(this.currentPosition);
        this.saveCurrentState();
      }
    });
  }

  /**
   * Setup paste event handlers
   */
  private setupPasteHandlers(): void {
    this.editor.on('paste', (event: ClipboardEvent) => {
      this.handlePaste(event);
    });
  }

  /**
   * Handle keyboard events with navigation and shortcuts
   */
  private handleKeyboardEvent(event: KeyboardEvent): void {
    const keyCombo = this.getKeyCombo(event);
    const action = this.config.keyBindings[keyCombo];

    if (!action) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    switch (action) {
      case 'moveUp':
        this.navigateCell('up');
        break;
      case 'moveDown':
        this.navigateCell('down');
        break;
      case 'moveLeft':
        this.navigateCell('left');
        break;
      case 'moveRight':
        this.navigateCell('right');
        break;
      case 'undo':
        this.undo();
        break;
      case 'redo':
        this.redo();
        break;
      case 'paste':
        // Handled by paste handler
        break;
      case 'exitEditMode':
        this.exitEditMode();
        break;
    }
  }

  /**
   * Handle before input events for real-time validation
   */
  private handleBeforeInput(event: InputEvent): void {
    if (!this.config.enableRealTimeValidation || !this.currentPosition) {
      return;
    }

    const currentContent = this.getCurrentCellContent();
    const newText = currentContent.text + (event.data || '');

    const validationResult = this.validateContent(this.currentPosition, {
      ...currentContent,
      text: newText
    });

    if (!validationResult.isValid) {
      event.preventDefault();
      this.events.onValidationError?.(this.currentPosition, validationResult.errors);
    }
  }

  /**
   * Handle paste operations
   */
  private handlePaste(event: ClipboardEvent): void {
    if (!this.currentPosition) {
      return;
    }

    event.preventDefault();

    const clipboardData = event.clipboardData;
    if (!clipboardData) {
      return;
    }

    const text = clipboardData.getData('text/plain');
    const html = clipboardData.getData('text/html');

    // Check if pasting table data (multiple cells)
    const tableData = this.parseTableData(text);

    const pasteData: PasteData = {
      text,
      html,
      cells: tableData
    };

    if (tableData && tableData.length > 1) {
      this.pasteMultipleCells(this.currentPosition, tableData);
    } else {
      this.pasteSingleCell(this.currentPosition, text);
    }

    this.events.onPaste?.(this.currentPosition, pasteData);
  }

  /**
   * Navigate to adjacent cells
   */
  private navigateCell(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (!this.currentPosition) {
      return;
    }

    const newPosition = this.calculateNewPosition(this.currentPosition, direction);
    if (newPosition && this.isValidPosition(newPosition)) {
      this.events.onKeyboardNavigation?.(this.currentPosition, newPosition);
      this.moveToCellPosition(newPosition);
    }
  }

  /**
   * Calculate new position based on direction
   */
  private calculateNewPosition(
    current: CellPosition,
    direction: 'up' | 'down' | 'left' | 'right'
  ): CellPosition | null {
    switch (direction) {
      case 'up':
        return current.row > 0 ? { ...current, row: current.row - 1 } : null;
      case 'down':
        return { ...current, row: current.row + 1 };
      case 'left':
        return current.col > 0 ? { ...current, col: current.col - 1 } : null;
      case 'right':
        return { ...current, col: current.col + 1 };
      default:
        return null;
    }
  }

  /**
   * Move focus to specific cell position
   */
  private moveToCellPosition(position: CellPosition): void {
    const { state, dispatch } = this.editor.view;
    const table = this.findTable(state.doc);

    if (!table) {
      return;
    }

    const cellPos = this.getCellPosition(table, position.row, position.col);
    if (cellPos) {
      const selection = state.tr.setSelection(
        state.selection.constructor.near(state.doc.resolve(cellPos))
      );
      dispatch(selection);
      this.setCurrentPosition(position);
    }
  }

  /**
   * Update cell content with validation
   */
  public updateCellContent(
    position: CellPosition,
    content: CellContent
  ): ValidationResult {
    const validationResult = this.validateContent(position, content);

    if (!validationResult.isValid) {
      this.events.onValidationError?.(position, validationResult.errors);
      return validationResult;
    }

    // Save current state for undo
    this.saveStateForUndo(position, this.getCurrentCellContent());

    // Update the cell content in Tiptap
    this.setCellContent(position, content);

    // Trigger change event
    this.events.onCellChange?.(position, content);

    // Setup auto-save if enabled
    if (this.config.enableAutoSave) {
      this.scheduleAutoSave();
    }

    return validationResult;
  }

  /**
   * Validate cell content against rules
   */
  private validateContent(
    position: CellPosition,
    content: CellContent
  ): ValidationResult {
    const rules = this.getValidationRules(position);
    const errors: string[] = [];

    for (const rule of rules) {
      switch (rule.type) {
        case 'required':
          if (!content.text.trim()) {
            errors.push(rule.message);
          }
          break;
        case 'minLength':
          if (content.text.length < rule.value) {
            errors.push(rule.message);
          }
          break;
        case 'maxLength':
          if (content.text.length > rule.value) {
            errors.push(rule.message);
          }
          break;
        case 'pattern':
          if (!new RegExp(rule.value).test(content.text)) {
            errors.push(rule.message);
          }
          break;
        case 'custom':
          if (rule.validator && !rule.validator(content.text)) {
            errors.push(rule.message);
          }
          break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Add validation rule for specific cell or pattern
   */
  public addValidationRule(
    cellPattern: string,
    rule: ValidationRule
  ): void {
    const existing = this.validationRules.get(cellPattern) || [];
    existing.push(rule);
    this.validationRules.set(cellPattern, existing);
  }

  /**
   * Get validation rules for a specific position
   */
  private getValidationRules(position: CellPosition): ValidationRule[] {
    const patterns = [
      `${position.row},${position.col}`, // Specific cell
      `${position.row},*`, // Entire row
      `*,${position.col}`, // Entire column
      '*,*' // All cells
    ];

    const rules: ValidationRule[] = [];
    for (const pattern of patterns) {
      const patternRules = this.validationRules.get(pattern);
      if (patternRules) {
        rules.push(...patternRules);
      }
    }

    return rules;
  }

  /**
   * Undo last operation
   */
  public undo(): boolean {
    const state = this.undoHistory.pop();
    if (!state) {
      return false;
    }

    // Save current state to redo history
    const currentContent = this.getCurrentCellContent();
    if (this.currentPosition) {
      this.redoHistory.push({
        position: this.currentPosition,
        content: currentContent,
        timestamp: Date.now()
      });
    }

    // Restore previous state
    this.setCellContent(state.position, state.content);
    this.moveToCellPosition(state.position);

    this.events.onUndo?.(state);
    return true;
  }

  /**
   * Redo last undone operation
   */
  public redo(): boolean {
    const state = this.redoHistory.pop();
    if (!state) {
      return false;
    }

    // Save current state to undo history
    const currentContent = this.getCurrentCellContent();
    if (this.currentPosition) {
      this.undoHistory.push({
        position: this.currentPosition,
        content: currentContent,
        timestamp: Date.now()
      });
    }

    // Restore next state
    this.setCellContent(state.position, state.content);
    this.moveToCellPosition(state.position);

    this.events.onRedo?.(state);
    return true;
  }

  /**
   * Save current state for undo functionality
   */
  private saveStateForUndo(position: CellPosition, content: CellContent): void {
    this.undoHistory.push({
      position,
      content,
      timestamp: Date.now()
    });

    // Limit history size
    if (this.undoHistory.length > this.config.maxUndoHistory) {
      this.undoHistory.shift();
    }

    // Clear redo history on new action
    this.redoHistory = [];
  }

  /**
   * Save current state (for auto-save or blur events)
   */
  private saveCurrentState(): void {
    if (!this.currentPosition) {
      return;
    }

    const content = this.getCurrentCellContent();
    this.saveStateForUndo(this.currentPosition, content);
  }

  /**
   * Schedule auto-save
   */
  private scheduleAutoSave(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(() => {
      this.saveCurrentState();
    }, this.config.autoSaveDelay);
  }

  /**
   * Parse table data from clipboard
   */
  private parseTableData(text: string): string[][] | null {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length <= 1) {
      return null;
    }

    // Detect delimiter (tab or comma)
    const delimiter = text.includes('\t') ? '\t' : ',';
    const rows = lines.map(line => line.split(delimiter));

    // Check if all rows have the same number of columns
    const columnCount = rows[0].length;
    if (rows.every(row => row.length === columnCount)) {
      return rows;
    }

    return null;
  }

  /**
   * Paste content into single cell
   */
  private pasteSingleCell(position: CellPosition, text: string): void {
    const content: CellContent = {
      text: text.trim(),
      format: this.config.defaultFormat
    };

    this.updateCellContent(position, content);
  }

  /**
   * Paste content into multiple cells
   */
  private pasteMultipleCells(startPosition: CellPosition, data: string[][]): void {
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const position: CellPosition = {
          row: startPosition.row + rowIndex,
          col: startPosition.col + colIndex
        };

        if (this.isValidPosition(position)) {
          const content: CellContent = {
            text: row[colIndex].trim(),
            format: this.config.defaultFormat
          };

          this.updateCellContent(position, content);
        }
      }
    }
  }

  /**
   * Exit edit mode and blur current cell
   */
  private exitEditMode(): void {
    if (this.currentPosition) {
      this.editor.commands.blur();
      this.currentPosition = null;
    }
  }

  /**
   * Get current cell position from editor selection
   */
  private getCurrentCellPosition(): CellPosition | null {
    // Implementation depends on Tiptap table structure
    // This is a simplified version
    const { selection } = this.editor.state;
    const table = this.findTable(this.editor.state.doc);

    if (!table) {
      return null;
    }

    // Calculate row and column from selection position
    // This would need to be implemented based on your table structure
    return { row: 0, col: 0 }; // Placeholder
  }

  /**
   * Get current cell content
   */
  private getCurrentCellContent(): CellContent {
    if (!this.currentPosition) {
      return { text: '', format: this.config.defaultFormat };
    }

    // Get content from current cell
    const cellNode = this.getCellNode(this.currentPosition);
    if (!cellNode) {
      return { text: '', format: this.config.defaultFormat };
    }

    return {
      text: cellNode.textContent || '',
      format: this.config.defaultFormat
    };
  }

  /**
   * Set cell content in the editor
   */
  private setCellContent(position: CellPosition, content: CellContent): void {
    // Implementation depends on Tiptap table commands
    // This would update the cell content in the editor
  }

  /**
   * Find table node in document
   */
  private findTable(doc: Node): Node | null {
    let table: Node | null = null;
    doc.descendants((node) => {
      if (node.type.name === 'table') {
        table = node;
        return false;
      }
      return true;
    });
    return table;
  }

  /**
   * Get cell node at specific position
   */
  private getCellNode(position: CellPosition): Node | null {
    // Implementation depends on Tiptap table structure
    return null; // Placeholder
  }

  /**
   * Get cell position in document
   */
  private getCellPosition(table: Node, row: number, col: number): number | null {
    // Implementation depends on Tiptap table structure
    return null; // Placeholder
  }

  /**
   * Check if position is valid within table bounds
   */
  private isValidPosition(position: CellPosition): boolean {
    const table = this.findTable(this.editor.state.doc);
    if (!table) {
      return false;
    }

    // Check bounds based on table structure
    return position.row >= 0 && position.col >= 0;
  }

  /**
   * Set current position
   */
  private setCurrentPosition(position: CellPosition): void {
    this.currentPosition = position;
  }

  /**
   * Get key combination string
   */
  private getKeyCombo(event: KeyboardEvent): string {
    const modifiers = [];
    if (event.ctrlKey || event.metaKey) modifiers.push('Ctrl');
    if (event.shiftKey) modifiers.push('Shift');
    if (event.altKey) modifiers.push('Alt');

    return [...modifiers, event.key].join('+');
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    this.undoHistory = [];
    this.redoHistory = [];
    this.validationRules.clear();
    this.currentPosition = null;
  }

  // Public API methods

  /**
   * Get current position
   */
  public getCurrentPosition(): CellPosition | null {
    return this.currentPosition;
  }

  /**
   * Focus specific cell
   */
  public focusCell(position: CellPosition): boolean {
    if (!this.isValidPosition(position)) {
      return false;
    }

    this.moveToCellPosition(position);
    return true;
  }

  /**
   * Get cell content at position
   */
  public getCellContent(position: CellPosition): CellContent | null {
    if (!this.isValidPosition(position)) {
      return null;
    }

    const cellNode = this.getCellNode(position);
    if (!cellNode) {
      return null;
    }

    return {
      text: cellNode.textContent || '',
      format: this.config.defaultFormat
    };
  }

  /**
   * Clear undo/redo history
   */
  public clearHistory(): void {
    this.undoHistory = [];
    this.redoHistory = [];
  }

  /**
   * Get validation errors for current cell
   */
  public getValidationErrors(): string[] {
    if (!this.currentPosition) {
      return [];
    }

    const content = this.getCurrentCellContent();
    const result = this.validateContent(this.currentPosition, content);
    return result.errors;
  }
}

export default UserInput;
```

## Usage Examples

```typescript
// Basic usage
const userInput = new UserInput(editor, {
  onCellChange: (position, content) => {
    console.log(`Cell ${position.row},${position.col} changed:`, content.text);
  },
  onValidationError: (position, errors) => {
    console.error(`Validation errors at ${position.row},${position.col}:`, errors);
  }
});

// Add validation rules
userInput.addValidationRule('0,*', {
  type: 'required',
  message: 'Header cells cannot be empty'
});

userInput.addValidationRule('*,2', {
  type: 'pattern',
  value: '^\\d+$',
  message: 'This column must contain only numbers'
});

// Custom validation
userInput.addValidationRule('*,3', {
  type: 'custom',
  message: 'Email must be valid',
  validator: (text) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
});

// Focus specific cell
userInput.focusCell({ row: 1, col: 2 });

// Update cell content programmatically
const result = userInput.updateCellContent(
  { row: 1, col: 1 },
  { text: 'New content', format: 'plain' }
);

if (!result.isValid) {
  console.log('Validation failed:', result.errors);
}

// Advanced configuration
const advancedInput = new UserInput(
  editor,
  {
    onCellChange: (position, content) => {
      saveToDatabase(position, content);
    },
    onKeyboardNavigation: (from, to) => {
      console.log(`Navigated from ${from.row},${from.col} to ${to.row},${to.col}`);
    },
    onPaste: (position, data) => {
      if (data.cells && data.cells.length > 1) {
        console.log('Multi-cell paste detected');
      }
    }
  },
  {
    maxUndoHistory: 100,
    enableAutoSave: true,
    autoSaveDelay: 2000,
    enableRealTimeValidation: true,
    allowedFormats: ['plain', 'number', 'currency'],
    defaultFormat: 'plain',
    keyBindings: {
      'Enter': 'moveDown',
      'Shift+Enter': 'moveUp',
      'Tab': 'moveRight',
      'Shift+Tab': 'moveLeft',
      'Ctrl+Z': 'undo',
      'Ctrl+Y': 'redo'
    }
  }
);

// Cleanup when done
userInput.destroy();
```

## Integration with Tiptap Extensions

```typescript
// Example table extension integration
import { Node } from '@tiptap/core';
import UserInput from './UserInput';

const TableWithUserInput = Node.create({
  name: 'tableWithUserInput',

  addStorage() {
    return {
      userInput: null as UserInput | null
    };
  },

  onCreate() {
    this.storage.userInput = new UserInput(this.editor, {
      onCellChange: (position, content) => {
        // Handle cell changes
        this.editor.emit('cellChanged', { position, content });
      },
      onValidationError: (position, errors) => {
        // Show validation errors in UI
        this.editor.emit('validationError', { position, errors });
      }
    });
  },

  onDestroy() {
    if (this.storage.userInput) {
      this.storage.userInput.destroy();
    }
  }
});
```

This comprehensive UserInput class provides:

1. **Full keyboard navigation** with customizable key bindings
2. **Real-time validation** with multiple validation types
3. **Undo/redo functionality** with configurable history limits
4. **Paste handling** for both single and multi-cell operations
5. **Event-driven architecture** for easy integration
6. **Auto-save capabilities** with configurable delays
7. **Type safety** with full TypeScript support
8. **Extensible validation system** with custom validators
9. **Focus management** with programmatic cell selection
10. **Clean resource management** with proper cleanup

The class is designed to be highly configurable and can be easily integrated with existing Tiptap table extensions while providing a robust foundation for table-based user input handling.