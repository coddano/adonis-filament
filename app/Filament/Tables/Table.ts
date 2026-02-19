import { Column } from './Column.js'
import { Filter } from './Filter.js'
import { Action } from './Action.js'

/**
 * Table - Main class to define a table
 *
 * Utilisation:
 * Table.make()
 *   .columns([
 *     TextColumn.make('name').label('Nom').sortable().searchable(),
 *     BooleanColumn.make('active').label('Actif'),
 *   ])
 *   .filters([
 *     SelectFilter.make('status').options([...]),
 *   ])
 *   .actions([
 *     EditAction.make(),
 *     DeleteAction.make(),
 *   ])
 */
export class Table {
  protected _columns: Column[] = []
  protected _filters: Filter[] = []
  protected _actions: Action[] = []
  protected _bulkActions: Action[] = []
  protected _headerActions: Action[] = []
  protected _defaultSort: { column: string; direction: 'asc' | 'desc' } | null = null
  protected _searchable: boolean = true
  protected _searchPlaceholder: string = 'Search...'
  protected _paginated: boolean = true
  protected _perPage: number = 10
  protected _perPageOptions: number[] = [10, 25, 50, 100]
  protected _selectable: boolean = true
  protected _striped: boolean = true
  protected _hoverable: boolean = true
  protected _emptyMessage: string = 'No results found'

  /**
   * Factory method
   */
  static make(): Table {
    return new Table()
  }

  /**
   * Define table columns
   */
  columns(columns: Column[]): this {
    this._columns = columns
    return this
  }

  /**
   * Define filters
   */
  filters(filters: Filter[]): this {
    this._filters = filters
    return this
  }

  /**
   * Define row actions (per record)
   */
  actions(actions: Action[]): this {
    this._actions = actions
    return this
  }

  /**
   * Define bulk actions
   */
  bulkActions(actions: Action[]): this {
    this._bulkActions = actions
    return this
  }

  /**
   * Define header actions (create, export, etc.)
   */
  headerActions(actions: Action[]): this {
    this._headerActions = actions
    return this
  }

  /**
   * Default sort
   */
  defaultSort(column: string, direction: 'asc' | 'desc' = 'asc'): this {
    this._defaultSort = { column, direction }
    return this
  }

  /**
   * Enable/disable global search
   */
  searchable(searchable: boolean = true, placeholder?: string): this {
    this._searchable = searchable
    if (placeholder) this._searchPlaceholder = placeholder
    return this
  }

  /**
   * Enable/disable pagination
   */
  paginated(paginated: boolean = true, perPage?: number): this {
    this._paginated = paginated
    if (perPage) this._perPage = perPage
    return this
  }

  /**
   * Options for items per page
   */
  perPageOptions(options: number[]): this {
    this._perPageOptions = options
    return this
  }

  /**
   * Enable/disable multi-select
   */
  selectable(selectable: boolean = true): this {
    this._selectable = selectable
    return this
  }

  /**
   * Striped row style
   */
  striped(striped: boolean = true): this {
    this._striped = striped
    return this
  }

  /**
   * Style hover sur les lignes
   */
  hoverable(hoverable: boolean = true): this {
    this._hoverable = hoverable
    return this
  }

  /**
   * Message quand la table est vide
   */
  emptyMessage(message: string): this {
    this._emptyMessage = message
    return this
  }

  // === Getters ===

  getColumns(): Column[] {
    return this._columns
  }

  getFilters(): Filter[] {
    return this._filters
  }

  getActions(): Action[] {
    return this._actions
  }

  getBulkActions(): Action[] {
    return this._bulkActions
  }

  getSearchableColumns(): string[] {
    return this._columns.filter((col) => col.isSearchable()).map((col) => col.getName())
  }

  getSortableColumns(): string[] {
    return this._columns.filter((col) => col.isSortable()).map((col) => col.getName())
  }

  /**
   * Convertit la Table en JSON pour le frontend
   */
  toJson(): Record<string, any> {
    return {
      columns: this._columns.map((col) => col.toJson()),
      filters: this._filters.map((filter) => filter.toJson()),
      actions: this._actions.map((action) => action.toJson()),
      bulkActions: this._bulkActions.map((action) => action.toJson()),
      headerActions: this._headerActions.map((action) => action.toJson()),
      defaultSort: this._defaultSort,
      searchable: this._searchable,
      searchPlaceholder: this._searchPlaceholder,
      searchableColumns: this.getSearchableColumns(),
      sortableColumns: this.getSortableColumns(),
      paginated: this._paginated,
      perPage: this._perPage,
      perPageOptions: this._perPageOptions,
      selectable: this._selectable,
      striped: this._striped,
      hoverable: this._hoverable,
      emptyMessage: this._emptyMessage,
    }
  }
}
