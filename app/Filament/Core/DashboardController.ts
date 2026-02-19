import type { HttpContext } from '@adonisjs/core/http'
import filament from './FilamentManager.js'
import { Widget } from '../Widgets/Widget.js'

export default class DashboardController {
  /**
   * Render dashboard
   */
  public async index({ inertia, request }: HttpContext) {
    const panel = filament.getCurrentPanel(request.url())

    if (!panel) {
      return inertia.render('errors/not_found', { message: 'Panel not found' })
    }

    // Initialize dashboard if configureDashboard exists
    let dashboard = panel.getDashboard()
    if (!dashboard && typeof panel.configureDashboard === 'function') {
      dashboard = panel.configureDashboard()
      if (dashboard) {
        panel.setDashboard(dashboard)
      }
    }

    if (dashboard) {
      panel.applyDashboardWidgets(dashboard)
    }

    const dashboardSchema = dashboard ? await dashboard.toJson() : null

    return inertia.render('admin/dashboard', {
      panel: {
        id: panel.id,
        path: panel.path,
        label: panel.label,
      },
      navigation: filament.getNavigationData(panel.id, request.url()),
      dashboard: dashboardSchema,
    })
  }

  /**
   * Get widget data (for polling)
   */
  public async getWidget({ request, response, params }: HttpContext) {
    const panel = filament.getCurrentPanel(request.url())

    if (!panel) {
      return response.notFound({ message: 'Panel not found' })
    }

    const dashboard = panel.getDashboard()
    if (!dashboard) {
      return response.notFound({ message: 'Dashboard not configured' })
    }

    const widget = dashboard.getWidgets().find((w: Widget) => w.getId() === params.widgetId)

    if (!widget) {
      return response.notFound({ message: 'Widget not found' })
    }

    const widgetData = await widget.toJson()

    return response.json({
      success: true,
      widget: widgetData,
    })
  }
}
