/**
 * Server-side type definitions for spreadsheet operations
 */

/**
 * Input payload received by the server when a user edits a cell
 *
 * This is the data sent from the client via tRPC mutation after a cell edit.
 * The server uses this to update the database and log the edit event.
 */
export interface UpdateCellInput {
  /**
   * UUID of the spreadsheet containing the cell
   */
  spreadsheetId: string;

  /**
   * Zero-indexed row position of the cell
   * @example 0 for first row, 7 for 8th row (in default 8-row spreadsheet)
   */
  rowIndex: number;

  /**
   * UUID of the column containing the cell
   */
  columnId: string;

  /**
   * New content to be stored in the cell
   * Empty string for cleared cells
   */
  content: string;
}

/**
 * Response returned by the server after successfully updating a cell
 */
export interface UpdateCellResponse {
  /**
   * UUID of the updated/created cell
   */
  id: string;

  /**
   * UUID of the parent spreadsheet
   */
  spreadsheetId: string;

  /**
   * Row position of the cell
   */
  rowIndex: number;

  /**
   * UUID of the column
   */
  columnId: string;

  /**
   * Current content of the cell after update
   */
  content: string;

  /**
   * Optional formatting metadata
   */
  format?: CellFormat;

  /**
   * Version number for conflict resolution
   * Incremented on each edit
   */
  version: number;

  /**
   * User ID of the last editor
   */
  lastEditedBy?: string;

  /**
   * Timestamp when the cell was created
   */
  createdAt: Date;

  /**
   * Timestamp when the cell was last updated
   */
  updatedAt: Date;
}

/**
 * Cell formatting options
 */
export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  backgroundColor?: string;
}

/**
 * Input payload for adding a new column
 */
export interface AddColumnInput {
  /**
   * UUID of the spreadsheet
   */
  spreadsheetId: string;

  /**
   * Title of the new column (REQUIRED, min 1 character)
   */
  title: string;

  /**
   * Zero-indexed position where the column should be inserted
   */
  position: number;

  /**
   * Optional custom width in pixels
   */
  width?: number;
}

/**
 * Column data structure
 */
export interface Column {
  /**
   * UUID of the column
   */
  id: string;

  /**
   * UUID of the parent spreadsheet
   */
  spreadsheetId: string;

  /**
   * Column title (user-defined, required)
   */
  title: string;

  /**
   * Zero-indexed position in the spreadsheet
   */
  position: number;

  /**
   * Optional custom width in pixels
   */
  width?: number;

  /**
   * Timestamp when the column was created
   */
  createdAt: Date;

  /**
   * Timestamp when the column was last updated
   */
  updatedAt: Date;
}

/**
 * Cell edit event logged to the database for audit trail
 */
export interface CellEditEvent {
  /**
   * UUID of the edit event
   */
  id: string;

  /**
   * UUID of the cell that was edited
   */
  cellId: string;

  /**
   * Content before the edit (null for new cells)
   */
  previousContent: string | null;

  /**
   * Content after the edit
   */
  newContent: string;

  /**
   * User ID of the editor (if authenticated)
   */
  editedBy?: string;

  /**
   * Timestamp when the edit occurred
   */
  editedAt: Date;
}

/**
 * Input payload received by the server when an automation updates a cell
 *
 * This is sent from automated processes (Robot Agents, formulas, data imports, etc.)
 * after an automation task completes and needs to update cell content.
 */
export interface RobotUpdateCellInput {
  /**
   * UUID of the spreadsheet containing the cell
   */
  spreadsheetId: string;

  /**
   * Zero-indexed row position of the cell
   */
  rowIndex: number;

  /**
   * UUID of the column containing the cell
   */
  columnId: string;

  /**
   * New content to be stored in the cell
   */
  content: string;

  /**
   * Type of automation that performed the update
   * @example 'formula', 'api_import', 'batch_update', 'scheduled_task'
   */
  automationType: AutomationType;

  /**
   * Unique identifier for the automation job/task
   * Used to track which automation performed the update
   */
  automationJobId: string;

  /**
   * Optional metadata about the automation
   */
  metadata?: RobotUpdateMetadata;

  /**
   * Confidence score for the automated update (0-1)
   * Used by AI/ML automations to indicate certainty
   * @default 1.0
   */
  confidence?: number;
}

/**
 * Types of automations that can update cells
 */
export type AutomationType =
  | 'formula'           // Spreadsheet formula (SUM, AVG, etc.)
  | 'api_import'        // Data fetched from external API
  | 'batch_update'      // Bulk data update operation
  | 'scheduled_task'    // Cron/scheduled automation
  | 'webhook'           // Webhook-triggered update
  | 'ai_agent'          // AI/ML agent update
  | 'data_transform'    // Data transformation pipeline
  | 'validation'        // Automated validation/correction
  | 'sync'              // External system synchronization
  | 'custom';           // Custom automation type

/**
 * Metadata for robot/automated cell updates
 */
export interface RobotUpdateMetadata {
  /**
   * Human-readable description of what the automation did
   */
  description?: string;

  /**
   * Source of the data (URL, API endpoint, etc.)
   */
  source?: string;

  /**
   * Parameters used by the automation
   */
  parameters?: Record<string, unknown>;

  /**
   * Duration of the automation task in milliseconds
   */
  durationMs?: number;

  /**
   * Number of retries attempted (if any)
   */
  retryCount?: number;

  /**
   * Timestamp when the automation started
   */
  startedAt?: Date;

  /**
   * Timestamp when the automation completed
   */
  completedAt?: Date;

  /**
   * Any warnings generated during automation
   */
  warnings?: string[];
}

/**
 * Response returned by the server after a robot updates a cell
 */
export interface RobotUpdateCellResponse extends UpdateCellResponse {
  /**
   * UUID of the robot input event logged to the database
   */
  robotEventId: string;

  /**
   * Type of automation that performed the update
   */
  automationType: AutomationType;

  /**
   * Job ID of the automation
   */
  automationJobId: string;
}

/**
 * Robot input event logged to the database for audit trail
 * Stored in the robot_input_events table
 */
export interface RobotInputEvent {
  /**
   * UUID of the robot input event
   */
  id: string;

  /**
   * UUID of the cell that was updated
   */
  cellId: string;

  /**
   * Type of automation
   */
  automationType: AutomationType;

  /**
   * Job ID of the automation
   */
  automationJobId: string;

  /**
   * Content before the automation update
   */
  previousContent: string | null;

  /**
   * Content after the automation update
   */
  newContent: string;

  /**
   * Confidence score (0-1)
   */
  confidence: number;

  /**
   * Metadata about the automation
   */
  metadata?: RobotUpdateMetadata;

  /**
   * Timestamp when the automation completed and updated the cell
   */
  completedAt: Date;

  /**
   * Reference to the user who triggered the automation (if applicable)
   */
  triggeredBy?: string;
}

/**
 * Input payload for creating a new spreadsheet
 */
export interface CreateSpreadsheetInput {
  /**
   * Name of the spreadsheet
   */
  name: string;

  /**
   * Initial column titles
   * @default ['Column A', 'Column B']
   */
  columnTitles?: string[];

  /**
   * Number of default rows
   * @default 8
   */
  defaultRows?: number;
}

/**
 * Spreadsheet data structure
 */
export interface Spreadsheet {
  /**
   * UUID of the spreadsheet
   */
  id: string;

  /**
   * Name of the spreadsheet
   */
  name: string;

  /**
   * Default number of rows
   */
  defaultRows: number;

  /**
   * User ID of the owner
   */
  ownerId: string;

  /**
   * Timestamp when the spreadsheet was created
   */
  createdAt: Date;

  /**
   * Timestamp when the spreadsheet was last updated
   */
  updatedAt: Date;
}

/**
 * Complete spreadsheet with columns and cells
 */
export interface SpreadsheetWithData extends Spreadsheet {
  /**
   * All columns in the spreadsheet, ordered by position
   */
  columns: Column[];

  /**
   * All cells in the spreadsheet
   */
  cells: Cell[];
}

/**
 * Cell data structure
 */
export interface Cell {
  /**
   * UUID of the cell
   */
  id: string;

  /**
   * UUID of the parent spreadsheet
   */
  spreadsheetId: string;

  /**
   * Zero-indexed row position
   */
  rowIndex: number;

  /**
   * UUID of the column
   */
  columnId: string;

  /**
   * Cell content
   */
  content: string;

  /**
   * Optional formatting metadata
   */
  format?: CellFormat;

  /**
   * Version number for conflict resolution
   */
  version: number;

  /**
   * User ID of the last editor
   */
  lastEditedBy?: string;

  /**
   * Timestamp when the cell was created
   */
  createdAt: Date;

  /**
   * Timestamp when the cell was last updated
   */
  updatedAt: Date;
}
