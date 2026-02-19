import vine from '@vinejs/vine'
import { Field } from '../Field.js'

/**
 * Toggle - Switch on/off
 */
export class Toggle extends Field {
  protected _onLabel: string | null = null
  protected _offLabel: string | null = null

  constructor(name: string) {
    super(name)
    this._defaultValue = false
  }

  getType(): string {
    return 'toggle'
  }

  /**
   * Label shown when toggle is enabled
   */
  onLabel(label: string): this {
    this._onLabel = label
    return this
  }

  /**
   * Label shown when toggle is disabled
   */
  offLabel(label: string): this {
    this._offLabel = label
    return this
  }

  /**
   * Generate VineJS validation
   */
  public toVine(_options?: { recordId?: number | string; model?: any }) {
    return vine.boolean().optional()
  }

  async toJson(): Promise<Record<string, any>> {
    return {
      ...(await super.toJson()),
      onLabel: this._onLabel,
      offLabel: this._offLabel,
    }
  }
}
