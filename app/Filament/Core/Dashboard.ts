import { Widget } from '../Widgets/Widget.js'

/**
 * Dashboard - Class to build dashboard
 */
export class Dashboard {
  protected _widgets: Widget[] = []
  protected _title: string = 'Dashboard'
  protected _description: string | null = null
  protected _columns: 1 | 2 | 3 | 4 = 4
  protected _gap: 'sm' | 'md' | 'lg' = 'md'

  constructor() {}

  static make(): Dashboard {
    return new Dashboard()
  }

  /**
   * Dashboard title
   */
  title(title: string): this {
    this._title = title
    return this
  }

  /**
   * Dashboard description
   */
  description(description: string): this {
    this._description = description
    return this
  }

  /**
   * Grid column count
   */
  columns(count: 1 | 2 | 3 | 4): this {
    this._columns = count
    return this
  }

  /**
   * Spacing between widgets
   */
  gap(size: 'sm' | 'md' | 'lg'): this {
    this._gap = size
    return this
  }

  /**
   * Add one or more widgets
   */
  widgets(widgets: Widget[]): this {
    this._widgets.push(...widgets)
    return this
  }

  /**
   * Add widget
   */
  widget(widget: Widget): this {
    this._widgets.push(widget)
    return this
  }

  /**
   * Get all widgets sorted
   */
  getWidgets(): Widget[] {
    return [...this._widgets].sort((a, b) => {
      const sortA = (a as any)._sort || 0
      const sortB = (b as any)._sort || 0
      return sortA - sortB
    })
  }

  /**
   * Serialize for frontend
   */
  async toJson(): Promise<Record<string, any>> {
    const widgetsJson = await Promise.all(
      this.getWidgets()
        .filter((w) => (w as any)._visible !== false)
        .map((w) => w.toJson())
    )

    return {
      title: this._title,
      description: this._description,
      columns: this._columns,
      gap: this._gap,
      widgets: widgetsJson,
    }
  }
}
