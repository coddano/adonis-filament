/**
 * Column - Classe abstraite pour toutes les colonnes de table
 *
 * Fluent usage: TextColumn.make('name').label('Name').sortable()
 */
export abstract class Column {
  protected _name: string
  protected _label: string | null = null
  protected _sortable: boolean = false
  protected _searchable: boolean = false
  protected _hidden: boolean = false
  protected _alignRight: boolean = false
  protected _width: string | null = null
  protected _tooltip: string | null = null

  constructor(name: string) {
    this._name = name
  }

  /**
   * Factory method to create a Column instance
   */
  static make<T extends Column>(this: new (name: string) => T, name: string): T {
    return new this(name)
  }

  label(label: string): this {
    this._label = label
    return this
  }

  sortable(sortable: boolean = true): this {
    this._sortable = sortable
    return this
  }

  searchable(searchable: boolean = true): this {
    this._searchable = searchable
    return this
  }

  hidden(hidden: boolean = true): this {
    this._hidden = hidden
    return this
  }

  alignRight(align: boolean = true): this {
    this._alignRight = align
    return this
  }

  width(width: string): this {
    this._width = width
    return this
  }

  tooltip(tooltip: string): this {
    this._tooltip = tooltip
    return this
  }

  /**
   * Column type (used by frontend rendering)
   */
  abstract getType(): string

  /**
   * Column name
   */
  getName(): string {
    return this._name
  }

  /**
   * Indicates whether column is searchable
   */
  isSearchable(): boolean {
    return this._searchable
  }

  /**
   * Indicates whether column is sortable
   */
  isSortable(): boolean {
    return this._sortable
  }

  /**
   * Convertit la Column en objet JSON pour le frontend
   */
  toJson(): Record<string, any> {
    return {
      type: this.getType(),
      name: this._name,
      label: this._label || this.formatLabel(),
      sortable: this._sortable,
      searchable: this._searchable,
      hidden: this._hidden,
      alignRight: this._alignRight,
      width: this._width,
      tooltip: this._tooltip,
    }
  }

  /**
   * Formate le nom en label lisible
   */
  protected formatLabel(): string {
    return this._name
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  }
}
