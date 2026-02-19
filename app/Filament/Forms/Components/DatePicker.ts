import vine from '@vinejs/vine'
import { Field } from '../Field.js'

export class DatePicker extends Field {
  protected _minDate: string | null = null
  protected _maxDate: string | null = null

  getType(): string {
    return 'date-picker'
  }

  minDate(date: string | Date): this {
    this._minDate = date instanceof Date ? date.toISOString().split('T')[0] : date
    return this
  }

  maxDate(date: string | Date): this {
    this._maxDate = date instanceof Date ? date.toISOString().split('T')[0] : date
    return this
  }

  public toVine() {
    // Validation simple de string pour l'instant, on pourrait valider le format date
    let schema = vine.string()
    return this._required ? schema : schema.optional()
  }

  async toJson(): Promise<Record<string, any>> {
    return {
      ...(await super.toJson()),
      minDate: this._minDate,
      maxDate: this._maxDate,
    }
  }
}
