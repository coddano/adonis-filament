import vine from '@vinejs/vine'
import { Field } from '../Field.js'

/**
 * Textarea - Zone de texte multiligne
 */
export class Textarea extends Field {
  protected _rows: number = 3
  protected _autosize: boolean = false

  getType(): string {
    return 'textarea'
  }

  /**
   * Nombre de lignes visibles
   */
  rows(rows: number): this {
    this._rows = rows
    return this
  }

  /**
   * Redimensionnement automatique
   */
  autosize(autosize: boolean = true): this {
    this._autosize = autosize
    return this
  }

  /**
   * Generate VineJS validation
   */
  public toVine(_options?: { recordId?: number | string; model?: any }) {
    const schema = vine.string()
    return this._required ? schema : schema.optional()
  }

  async toJson(): Promise<Record<string, any>> {
    return {
      ...(await super.toJson()),
      rows: this._rows,
      autosize: this._autosize,
    }
  }
}
