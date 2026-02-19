import { Column } from '../Column.js'

/**
 * TextColumn - Colonne de texte simple
 */
export class TextColumn extends Column {
  protected _limit: number | null = null
  protected _copyable: boolean = false
  protected _prefix: string | null = null
  protected _suffix: string | null = null
  protected _placeholder: string = '-'
  protected _wrap: boolean = false
  protected _dateTimeFormat: string | null = null

  getType(): string {
    return 'text'
  }

  /**
   * Limit number of displayed characters
   */
  limit(limit: number): this {
    this._limit = limit
    return this
  }

  /**
   * Permet de copier la valeur au clic
   */
  copyable(copyable: boolean = true): this {
    this._copyable = copyable
    return this
  }

  /**
   * Add prefix to value
   */
  prefix(prefix: string): this {
    this._prefix = prefix
    return this
  }

  /**
   * Add suffix to value
   */
  suffix(suffix: string): this {
    this._suffix = suffix
    return this
  }

  /**
   * Text shown when value is empty
   */
  placeholder(placeholder: string): this {
    this._placeholder = placeholder
    return this
  }

  /**
   * Enable line wrapping
   */
  wrap(wrap: boolean = true): this {
    this._wrap = wrap
    return this
  }

  /**
   * Formatte la valeur comme date/heure
   */
  dateTime(format: string = 'dd/MM/yyyy HH:mm'): this {
    this._dateTimeFormat = format
    return this
  }

  toJson(): Record<string, any> {
    return {
      ...super.toJson(),
      limit: this._limit,
      copyable: this._copyable,
      prefix: this._prefix,
      suffix: this._suffix,
      placeholder: this._placeholder,
      wrap: this._wrap,
      dateTimeFormat: this._dateTimeFormat,
    }
  }
}
