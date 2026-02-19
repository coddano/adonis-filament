/**
 * Widget - Classe de base abstraite pour tous les widgets
 */
export abstract class Widget {
  protected _id: string
  protected _heading: string | null = null
  protected _description: string | null = null
  protected _columnSpan: 1 | 2 | 3 | 4 | 'full' = 1
  protected _sort: number = 0
  protected _icon: string | null = null
  protected _visible: boolean = true
  protected _lazy: boolean = false
  protected _pollingInterval: number | null = null

  constructor(id: string) {
    this._id = id
  }

  /**
   * Set widget title
   */
  heading(heading: string): this {
    this._heading = heading
    return this
  }

  /**
   * Set description
   */
  description(description: string): this {
    this._description = description
    return this
  }

  /**
   * Set number of columns (1-4 or 'full')
   */
  columnSpan(span: 1 | 2 | 3 | 4 | 'full'): this {
    this._columnSpan = span
    return this
  }

  /**
   * Ordre d'affichage
   */
  sort(order: number): this {
    this._sort = order
    return this
  }

  /**
   * Widget icon
   */
  icon(icon: string): this {
    this._icon = icon
    return this
  }

  /**
   * Conditional visibility
   */
  visible(condition: boolean = true): this {
    this._visible = condition
    return this
  }

  /**
   * Chargement paresseux
   */
  lazy(lazy: boolean = true): this {
    this._lazy = lazy
    return this
  }

  /**
   * Auto-refresh (seconds)
   */
  pollingInterval(seconds: number): this {
    this._pollingInterval = seconds
    return this
  }

  abstract getType(): string
  abstract getData(): Promise<Record<string, any>>

  getId(): string {
    return this._id
  }

  async toJson(): Promise<Record<string, any>> {
    return {
      id: this._id,
      type: this.getType(),
      heading: this._heading,
      description: this._description,
      columnSpan: this._columnSpan,
      sort: this._sort,
      icon: this._icon,
      visible: this._visible,
      lazy: this._lazy,
      pollingInterval: this._pollingInterval,
      data: await this.getData(),
    }
  }
}
