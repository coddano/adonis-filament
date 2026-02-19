import vine from '@vinejs/vine'
import { Field } from '../Field.js'

export interface SelectOption {
  value: string | number
  label: string
}

/**
 * Select - Dropdown menu
 */
export class Select extends Field {
  protected _options: SelectOption[] = []
  protected _searchable: boolean = false
  protected _clearable: boolean = false

  getType(): string {
    return 'select'
  }

  /**
   * Options du select
   */
  options(
    options: SelectOption[] | Record<string, string> | (() => Promise<SelectOption[]>)
  ): this {
    if (typeof options === 'function') {
      this._options = options as any // On stocke la fonction temporairement
    } else if (Array.isArray(options)) {
      this._options = options
    } else {
      this._options = Object.entries(options).map(([value, label]) => ({
        value,
        label,
      }))
    }
    return this
  }

  /**
   * Enable search in options
   */
  searchable(searchable: boolean = true): this {
    this._searchable = searchable
    return this
  }

  /**
   * Allow clearing selection
   */
  clearable(clearable: boolean = true): this {
    this._clearable = clearable
    return this
  }

  /**
   * Generate VineJS validation
   */
  public toVine(_options?: { recordId?: number | string; model?: any }) {
    const schema = vine.any() // Le select peut renvoyer string ou number
    return this._required ? schema : schema.optional()
  }

  async toJson(): Promise<Record<string, any>> {
    let options = this._options

    // Resolve options when it is a function
    if (typeof this._options === 'function') {
      options = await (this._options as Function)()
    }

    return {
      ...(await super.toJson()),
      options: options,
      searchable: this._searchable,
      clearable: this._clearable,
      multiple: this._multiple,
    }
  }

  protected _multiple: boolean = false

  /**
   * Allow multiple selection
   */
  multiple(multiple: boolean = true): this {
    this._multiple = multiple
    return this
  }
}
