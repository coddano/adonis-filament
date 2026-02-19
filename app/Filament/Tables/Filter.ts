/**
 * Filter - Class to define table filters
 */
export abstract class Filter {
  protected _name: string
  protected _label: string | null = null
  protected _placeholder: string | null = null

  constructor(name: string) {
    this._name = name
  }

  /**
   * Factory method
   */
  static make<T extends Filter>(this: new (name: string) => T, name: string): T {
    return new this(name)
  }

  label(label: string): this {
    this._label = label
    return this
  }

  placeholder(placeholder: string): this {
    this._placeholder = placeholder
    return this
  }

  abstract getType(): string

  getName(): string {
    return this._name
  }

  toJson(): Record<string, any> {
    return {
      type: this.getType(),
      name: this._name,
      label: this._label || this.formatLabel(),
      placeholder: this._placeholder,
    }
  }

  protected formatLabel(): string {
    return this._name
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  }
}

/**
 * SelectFilter - Filtre de type select
 */
export class SelectFilter extends Filter {
  protected _options: { value: string | number; label: string }[] = []
  protected _multiple: boolean = false

  getType(): string {
    return 'select'
  }

  options(options: { value: string | number; label: string }[] | Record<string, string>): this {
    if (Array.isArray(options)) {
      this._options = options
    } else {
      this._options = Object.entries(options).map(([value, label]) => ({
        value,
        label,
      }))
    }
    return this
  }

  multiple(multiple: boolean = true): this {
    this._multiple = multiple
    return this
  }

  toJson(): Record<string, any> {
    return {
      ...super.toJson(),
      options: this._options,
      multiple: this._multiple,
    }
  }
}

/**
 * BooleanFilter - Boolean filter (Yes/No/All)
 */
export class BooleanFilter extends Filter {
  protected _trueLabel: string = 'Yes'
  protected _falseLabel: string = 'No'

  getType(): string {
    return 'boolean'
  }

  labels(trueLabel: string, falseLabel: string): this {
    this._trueLabel = trueLabel
    this._falseLabel = falseLabel
    return this
  }

  toJson(): Record<string, any> {
    return {
      ...super.toJson(),
      trueLabel: this._trueLabel,
      falseLabel: this._falseLabel,
    }
  }
}

/**
 * DateFilter - Filtre pour les dates
 */
export class DateFilter extends Filter {
  protected _minDate: string | null = null
  protected _maxDate: string | null = null

  getType(): string {
    return 'date'
  }

  minDate(date: string): this {
    this._minDate = date
    return this
  }

  maxDate(date: string): this {
    this._maxDate = date
    return this
  }

  toJson(): Record<string, any> {
    return {
      ...super.toJson(),
      minDate: this._minDate,
      maxDate: this._maxDate,
    }
  }
}
