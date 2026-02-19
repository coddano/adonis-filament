import vine from '@vinejs/vine'
import { Field } from '../Field.js'
import db from '@adonisjs/lucid/services/db'

/**
 * TextInput - Champ de saisie de texte
 */
export class TextInput extends Field {
  protected _minLength: number | null = null
  protected _maxLength: number | null = null
  protected _prefix: string | null = null
  protected _suffix: string | null = null
  protected _autocomplete: string | null = null
  protected _unique: boolean = false
  protected _uniqueTable: string | null = null

  getType(): string {
    return 'text-input'
  }

  minLength(length: number): this {
    this._minLength = length
    this._rules.push(`minLength:${length}`)
    return this
  }

  maxLength(length: number): this {
    this._maxLength = length
    this._rules.push(`maxLength:${length}`)
    return this
  }

  prefix(prefix: string): this {
    this._prefix = prefix
    return this
  }

  suffix(suffix: string): this {
    this._suffix = suffix
    return this
  }

  autocomplete(value: string): this {
    this._autocomplete = value
    return this
  }

  /**
   * Indicates value must be unique in table
   */
  unique(table?: string): this {
    this._unique = true
    this._uniqueTable = table || null
    return this
  }

  /**
   * Generate VineJS validation
   */
  public toVine(_options?: { recordId?: number | string; model?: any }) {
    let schema = vine.string()

    // Handle unique rule with async callback
    if (this._unique) {
      const table = this._uniqueTable || _options?.model?.table || 'users'
      const column = this._name
      const recordId = _options?.recordId

      schema = schema.use(
        vine.createRule(async (value, _, field) => {
          const query = db.from(table).where(column, value as string)

          if (recordId) {
            query.whereNot('id', recordId)
          }

          const exists = await query.first()
          if (exists) {
            field.report(`This value is already in use`, 'unique', field)
          }
        })()
      )
    }

    if (this._minLength) {
      schema = schema.minLength(this._minLength)
    }

    if (this._maxLength) {
      schema = schema.maxLength(this._maxLength)
    }

    return this._required ? schema : schema.optional()
  }

  async toJson(): Promise<Record<string, any>> {
    return {
      ...(await super.toJson()),
      minLength: this._minLength,
      maxLength: this._maxLength,
      prefix: this._prefix,
      suffix: this._suffix,
      autocomplete: this._autocomplete,
      unique: this._unique,
      slugFrom: this._slugFrom,
    }
  }

  protected _slugFrom: string | null = null

  /**
   * Auto-generate slug from another field
   */
  slugFrom(field: string): this {
    this._slugFrom = field
    return this
  }
}
