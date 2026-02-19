import vine from '@vinejs/vine'
import { TextInput } from './TextInput.js'

/**
 * PasswordInput - Champ de saisie de mot de passe
 * Avec option de reveal et confirmation
 */
export class PasswordInput extends TextInput {
  protected _revealable: boolean = true
  protected _confirmed: boolean = false

  constructor(name: string) {
    super(name)
    this._autocomplete = 'new-password'
  }

  getType(): string {
    return 'password-input'
  }

  /**
   * Allow password reveal
   */
  revealable(revealable: boolean = true): this {
    this._revealable = revealable
    return this
  }

  /**
   * Requiert une confirmation du mot de passe
   */
  confirmed(): this {
    this._confirmed = true
    this._rules.push('confirmed')
    return this
  }

  /**
   * Generate VineJS validation
   */
  public toVine(_options?: { recordId?: number | string; model?: any }) {
    let schema = vine.string()

    if (this._confirmed) {
      schema = schema.confirmed()
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
      revealable: this._revealable,
      confirmed: this._confirmed,
    }
  }
}
