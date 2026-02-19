import vine from '@vinejs/vine'
import { TextInput } from './TextInput.js'
import db from '@adonisjs/lucid/services/db'

/**
 * EmailInput - Champ de saisie d'email
 * Extends TextInput with automatic email validation
 */
export class EmailInput extends TextInput {
  protected _unique: boolean = false
  protected _uniqueTable: string | null = null

  constructor(name: string) {
    super(name)
    this._rules.push('email')
    this._autocomplete = 'email'
  }

  getType(): string {
    return 'email-input'
  }

  /**
   * Indicates email must be unique in table
   */
  unique(table?: string): this {
    this._unique = true
    this._uniqueTable = table || null
    return this
  }

  /**
   * Generate VineJS validation
   */
  /**
   * Generate VineJS validation
   */
  public toVine(_options?: { recordId?: number | string; model?: any }) {
    let schema = vine.string().email()

    // Call parent toVine for other rules (unique, minLength, etc)
    // Cannot easily call super.toVine() here because schema is composed differently...
    // Either reimplement unique logic here or call super.toVine() and modify returned schema?
    // VineJS does not always make it easy to extend an existing schema without re-declaring it.

    // To keep it simple, reuse parent unique logic when available
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
}
