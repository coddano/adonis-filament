/**
 * Field - Classe abstraite pour tous les champs de formulaire
 *
 * Fluent usage: TextInput.make('name').label('Name').required()
 */
export abstract class Field {
  protected _name: string
  protected _label: string | null = null
  protected _placeholder: string | null = null
  protected _helperText: string | null = null
  protected _required: boolean = false
  protected _disabled: boolean = false
  protected _defaultValue: any = null
  protected _rules: string[] = []
  protected _columnSpan: number = 1

  constructor(name: string) {
    this._name = name
  }

  /**
   * Factory method to create a Field instance
   */
  static make<T extends Field>(this: new (name: string) => T, name: string): T {
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

  helperText(text: string): this {
    this._helperText = text
    return this
  }

  required(required: boolean = true): this {
    this._required = required
    if (required && !this._rules.includes('required')) {
      this._rules.push('required')
    }
    return this
  }

  disabled(disabled: boolean = true): this {
    this._disabled = disabled
    return this
  }

  default(value: any): this {
    this._defaultValue = value
    return this
  }

  rules(rules: string[]): this {
    this._rules = [...this._rules, ...rules]
    return this
  }

  columnSpan(span: number): this {
    this._columnSpan = span
    return this
  }

  /**
   * Field type (used for frontend mapping)
   */
  abstract getType(): string

  /**
   * Generate VineJS validation for this field
   */
  public abstract toVine(options?: { recordId?: number | string; model?: any }): any

  /**
   * Field name
   */
  getName(): string {
    return this._name
  }

  /**
   * Validation rules
   */
  getRules(): string[] {
    return this._rules
  }

  /**
   * Convertit le Field en objet JSON pour le frontend
   */
  async toJson(): Promise<Record<string, any>> {
    return {
      type: this.getType(),
      name: this._name,
      label: this._label || this.formatLabel(),
      placeholder: this._placeholder,
      helperText: this._helperText,
      required: this._required,
      disabled: this._disabled,
      defaultValue: this._defaultValue,
      rules: this._rules,
      columnSpan: this._columnSpan,
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
