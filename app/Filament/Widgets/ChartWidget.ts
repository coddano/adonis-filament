import { Widget } from './Widget.js'

export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'doughnut' | 'radar'

interface ChartDataset {
  label: string
  data: number[] | (() => Promise<number[]>)
  color?: string | string[]
  backgroundColor?: string | string[]
  borderColor?: string | string[]
  fill?: boolean
}

/**
 * ChartWidget - Widget pour afficher des graphiques
 */
export class ChartWidget extends Widget {
  protected _chartType: ChartType = 'line'
  protected _labels: string[] = []
  protected _datasets: ChartDataset[] = []
  protected _height: number = 300
  protected _showLegend: boolean = true
  protected _showGrid: boolean = true
  protected _colors: string[] = [
    '#5046e5', // primary
    '#10b981', // success
    '#f59e0b', // warning
    '#ef4444', // danger
    '#6366f1', // indigo
    '#8b5cf6', // violet
  ]

  constructor(id: string = 'chart') {
    super(id)
    this._columnSpan = 2
  }

  static make(id: string = 'chart'): ChartWidget {
    return new ChartWidget(id)
  }

  getType(): string {
    return 'chart'
  }

  /**
   * Type de graphique
   */
  type(type: ChartType): this {
    this._chartType = type
    return this
  }

  /**
   * Labels de l'axe X
   */
  labels(labels: string[]): this {
    this._labels = labels
    return this
  }

  /**
   * Ajouter un dataset
   */
  dataset(
    label: string,
    data: number[] | (() => Promise<number[]>),
    options?: Partial<ChartDataset>
  ): this {
    this._datasets.push({
      label,
      data,
      ...options,
    })
    return this
  }

  /**
   * Hauteur du graphique en pixels
   */
  height(height: number): this {
    this._height = height
    return this
  }

  /**
   * Show legend
   */
  legend(show: boolean = true): this {
    this._showLegend = show
    return this
  }

  /**
   * Afficher la grille
   */
  grid(show: boolean = true): this {
    this._showGrid = show
    return this
  }

  /**
   * Custom color palette
   */
  colors(colors: string[]): this {
    this._colors = colors
    return this
  }

  async getData(): Promise<Record<string, any>> {
    const resolvedDatasets = await Promise.all(
      this._datasets.map(async (dataset, index) => {
        const data = typeof dataset.data === 'function' ? await dataset.data() : dataset.data

        // For Pie/Doughnut, multiple default colors are often preferred if not specified
        let defaultBgColor: string | string[]
        let defaultBorderColor: string | string[]

        if (['pie', 'doughnut'].includes(this._chartType)) {
          // Use full palette for segments
          defaultBgColor = this._colors
          defaultBorderColor = this._colors
        } else {
          // Une couleur par dataset pour les autres types
          const color = this._colors[index % this._colors.length]
          defaultBgColor = color + '33' // Transparent
          defaultBorderColor = color
        }

        return {
          label: dataset.label,
          data,
          backgroundColor: dataset.backgroundColor || defaultBgColor,
          borderColor: dataset.borderColor || dataset.color || defaultBorderColor,
          fill: dataset.fill ?? this._chartType === 'area',
        }
      })
    )

    return {
      type: this._chartType,
      labels: this._labels,
      datasets: resolvedDatasets,
      height: this._height,
      options: {
        showLegend: this._showLegend,
        showGrid: this._showGrid,
      },
    }
  }
}

/**
 * Shortcut to quickly create a ChartWidget
 */
export function chartWidget(id: string = 'chart') {
  return ChartWidget.make(id)
}
