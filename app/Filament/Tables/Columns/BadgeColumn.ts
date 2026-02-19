import { Column } from '../Column.js'

export interface BadgeOption {
  value: string | number | boolean
  label: string
  color: string
  icon?: string
}

/**
 * BadgeColumn - Column to display colored badges
 */
export class BadgeColumn extends Column {
  protected _options: BadgeOption[] = []
  protected _defaultColor: string = 'gray'

  getType(): string {
    return 'badge'
  }

  /**
   * Define badge options
   */
  options(
    options: BadgeOption[] | Record<string, { label: string; color: string; icon?: string }>
  ): this {
    if (Array.isArray(options)) {
      this._options = options
    } else {
      this._options = Object.entries(options).map(([value, config]) => ({
        value,
        ...config,
      }))
    }
    return this
  }

  /**
   * Default color when value does not match any option
   */
  defaultColor(color: string): this {
    this._defaultColor = color
    return this
  }

  toJson(): Record<string, any> {
    return {
      ...super.toJson(),
      options: this._options,
      defaultColor: this._defaultColor,
    }
  }
}
