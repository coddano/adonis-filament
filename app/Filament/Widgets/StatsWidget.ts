import { Widget } from './Widget.js'

export type TrendDirection = 'up' | 'down' | 'neutral'
export type StatColor = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'secondary'

interface StatConfig {
  label: string
  value: string | number | (() => Promise<string | number>)
  description?: string
  trend?: {
    value: number
    direction: TrendDirection
    label?: string
  }
  icon?: string
  color?: StatColor
  chart?: number[] // Mini sparkline data
}

/**
 * StatsWidget - Widget pour afficher des statistiques
 */
export class StatsWidget extends Widget {
  protected _stats: StatConfig[] = []
  protected _columns: 1 | 2 | 3 | 4 = 4

  constructor(id: string = 'stats') {
    super(id)
    this._columnSpan = 'full'
  }

  static make(id: string = 'stats'): StatsWidget {
    return new StatsWidget(id)
  }

  getType(): string {
    return 'stats'
  }

  /**
   * Ajouter une statistique
   */
  stat(config: StatConfig): this {
    this._stats.push(config)
    return this
  }

  /**
   * Number of columns for stats grid
   */
  columns(count: 1 | 2 | 3 | 4): this {
    this._columns = count
    return this
  }

  async getData(): Promise<Record<string, any>> {
    const resolvedStats = await Promise.all(
      this._stats.map(async (stat) => ({
        ...stat,
        value: typeof stat.value === 'function' ? await stat.value() : stat.value,
      }))
    )

    return {
      stats: resolvedStats,
      columns: this._columns,
    }
  }
}

/**
 * Shortcut to quickly create a StatsWidget
 */
export function statsWidget(id: string = 'stats') {
  return StatsWidget.make(id)
}
