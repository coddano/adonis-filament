import { Widget } from './Widget.js'

interface TableColumn {
  name: string
  label: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  format?: 'text' | 'number' | 'currency' | 'date' | 'badge'
  badgeColors?: Record<string, string>
}

interface TableRow {
  [key: string]: any
}

/**
 * TableWidget - Widget pour afficher une mini-table
 */
export class TableWidget extends Widget {
  protected _columns: TableColumn[] = []
  protected _rows: TableRow[] | (() => Promise<TableRow[]>) = []
  protected _limit: number = 5
  protected _showHeader: boolean = true
  protected _striped: boolean = false
  protected _hoverable: boolean = true
  protected _emptyMessage: string = 'No data'
  protected _footer: string | null = null
  protected _viewAllUrl: string | null = null

  constructor(id: string = 'table') {
    super(id)
    this._columnSpan = 2
  }

  static make(id: string = 'table'): TableWidget {
    return new TableWidget(id)
  }

  getType(): string {
    return 'table'
  }

  /**
   * Set columns
   */
  columns(columns: TableColumn[]): this {
    this._columns = columns
    return this
  }

  /**
   * Add a column
   */
  column(name: string, label: string, options?: Partial<TableColumn>): this {
    this._columns.push({ name, label, ...options })
    return this
  }

  /**
   * Set data
   */
  rows(rows: TableRow[] | (() => Promise<TableRow[]>)): this {
    this._rows = rows
    return this
  }

  /**
   * Limit number of displayed rows
   */
  limit(count: number): this {
    this._limit = count
    return this
  }

  /**
   * Show header
   */
  header(show: boolean = true): this {
    this._showHeader = show
    return this
  }

  /**
   * Striped rows
   */
  striped(striped: boolean = true): this {
    this._striped = striped
    return this
  }

  /**
   * Effet au survol
   */
  hoverable(hoverable: boolean = true): this {
    this._hoverable = hoverable
    return this
  }

  /**
   * Message si vide
   */
  emptyMessage(message: string): this {
    this._emptyMessage = message
    return this
  }

  /**
   * Texte du footer
   */
  footer(text: string): this {
    this._footer = text
    return this
  }

  /**
   * Lien "Voir tout"
   */
  viewAllUrl(url: string): this {
    this._viewAllUrl = url
    return this
  }

  async getData(): Promise<Record<string, any>> {
    let resolvedRows = typeof this._rows === 'function' ? await this._rows() : this._rows

    // Limiter les lignes
    resolvedRows = resolvedRows.slice(0, this._limit)

    return {
      columns: this._columns,
      rows: resolvedRows,
      options: {
        showHeader: this._showHeader,
        striped: this._striped,
        hoverable: this._hoverable,
        emptyMessage: this._emptyMessage,
        footer: this._footer,
        viewAllUrl: this._viewAllUrl,
      },
    }
  }
}

/**
 * Shortcut to quickly create a TableWidget
 */
export function tableWidget(id: string = 'table') {
  return TableWidget.make(id)
}
