import { Column } from '../Column.js'

/**
 * BooleanColumn - Column to display boolean values
 */
export class BooleanColumn extends Column {
  protected _trueLabel: string = 'Yes'
  protected _falseLabel: string = 'No'
  protected _trueIcon: string = 'check'
  protected _falseIcon: string = 'x'
  protected _trueColor: string = 'success'
  protected _falseColor: string = 'danger'

  getType(): string {
    return 'boolean'
  }

  /**
   * Custom labels for true/false
   */
  labels(trueLabel: string, falseLabel: string): this {
    this._trueLabel = trueLabel
    this._falseLabel = falseLabel
    return this
  }

  /**
   * Custom icons for true/false
   */
  icons(trueIcon: string, falseIcon: string): this {
    this._trueIcon = trueIcon
    this._falseIcon = falseIcon
    return this
  }

  /**
   * Custom colors for true/false
   */
  colors(trueColor: string, falseColor: string): this {
    this._trueColor = trueColor
    this._falseColor = falseColor
    return this
  }

  toJson(): Record<string, any> {
    return {
      ...super.toJson(),
      trueLabel: this._trueLabel,
      falseLabel: this._falseLabel,
      trueIcon: this._trueIcon,
      falseIcon: this._falseIcon,
      trueColor: this._trueColor,
      falseColor: this._falseColor,
    }
  }
}
