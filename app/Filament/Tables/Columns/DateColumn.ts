import { Column } from '../Column.js'

/**
 * DateColumn - Colonne pour afficher des dates
 */
export class DateColumn extends Column {
  protected _format: string = 'dd/MM/yyyy'
  protected _timezone: string | null = null
  protected _since: boolean = false

  getType(): string {
    return 'date'
  }

  /**
   * Format de la date (Luxon format)
   */
  format(format: string): this {
    this._format = format
    return this
  }

  /**
   * Format datetime (date + heure)
   */
  dateTime(): this {
    this._format = 'dd/MM/yyyy HH:mm'
    return this
  }

  /**
   * Format date seulement
   */
  date(): this {
    this._format = 'dd/MM/yyyy'
    return this
  }

  /**
   * Format heure seulement
   */
  time(): this {
    this._format = 'HH:mm'
    return this
  }

  /**
   * Affiche "il y a X temps" au lieu de la date
   */
  since(since: boolean = true): this {
    this._since = since
    return this
  }

  /**
   * Timezone pour l'affichage
   */
  timezone(timezone: string): this {
    this._timezone = timezone
    return this
  }

  toJson(): Record<string, any> {
    return {
      ...super.toJson(),
      format: this._format,
      timezone: this._timezone,
      since: this._since,
    }
  }
}
