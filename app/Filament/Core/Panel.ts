import { Resource } from './Resource.js'
import { Dashboard } from './Dashboard.js'
import { PageConstructor } from './FilamentManager.js'
import { Widget } from '../Widgets/Widget.js'
import { Plugin, PluginManifest, PluginRuntimeContext, normalizePluginId } from './Plugin.js'

/**
 * Theme configuration
 */
export interface ThemeConfig {
  // Branding
  brandName?: string
  logo?: {
    light?: string // Logo URL in light mode
    dark?: string // Logo URL in dark mode
    height?: string // Logo height (e.g. '2rem')
  }
  favicon?: string

  // Couleurs (format HSL sans 'hsl()')
  colors?: {
    primary?: string // ex: '221.2 83.2% 53.3%'
    secondary?: string
    accent?: string
    danger?: string
    warning?: string
    success?: string
    info?: string
  }

  // Dark mode
  darkMode?: 'auto' | 'light' | 'dark' | 'class'

  // Custom CSS
  customCss?: string

  // Font
  font?: {
    family?: string // ex: 'Inter, sans-serif'
    url?: string // ex: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
  }

  // Sidebar
  sidebar?: {
    width?: string // ex: '280px'
    collapsedWidth?: string // ex: '80px'
    collapsible?: boolean
  }

  // Navigation
  navigation?: {
    position?: 'sidebar' | 'top'
  }
}

export interface PanelNavigationItem {
  label: string
  icon?: string
  url: string
  isActive?: boolean
}

export interface PanelNavigationGroup {
  label: string
  items: PanelNavigationItem[]
}

export type PanelMiddlewareFactory = () => Promise<any> | any

export type PanelActionScope = 'record' | 'bulk' | 'header'

export interface PanelActionRegistration {
  scope: PanelActionScope
  action: Record<string, any>
  resourceSlugs?: string[]
}

export type PanelTableSchemaHook = (payload: {
  panel: Panel
  resource: any
  schema: Record<string, any>
}) => Record<string, any> | void

export abstract class Panel {
  public abstract id: string
  public abstract path: string

  // Resources statically defined in child Panel
  public abstract resources: (typeof Resource)[]

  // Pages statically defined
  public abstract pages: PageConstructor[]

  // Dynamic storage for plugin additions
  protected dynamicResources: (typeof Resource)[] = []
  protected dynamicPages: PageConstructor[] = []
  protected pluginEntries: Array<{ plugin: Plugin; context: PluginRuntimeContext }> = []
  protected pluginOptions: Map<string, Record<string, any>> = new Map()
  protected pluginManifests: Map<string, PluginManifest | null> = new Map()
  protected pluginAllowList: Set<string> | null = null
  protected pluginBlockList: Set<string> = new Set()
  protected dynamicNavigationGroups: PanelNavigationGroup[] = []
  protected dynamicMiddlewareFactories: PanelMiddlewareFactory[] = []
  protected dynamicDashboardWidgets: Widget[] = []
  protected dynamicActionRegistrations: PanelActionRegistration[] = []
  protected tableSchemaHooks: PanelTableSchemaHook[] = []
  protected enforceTenantScopedPluginResources: boolean = false
  protected pluginErrors: Array<{ pluginId: string; phase: 'register' | 'boot'; message: string }> =
    []
  protected isBooted: boolean = false

  /**
   * Label shown in navigation
   */
  public label: string = 'Admin'

  /**
   * Dashboard (optionnel)
   */
  protected dashboard: Dashboard | null = null

  /**
   * Theme configuration
   */
  protected themeConfig: ThemeConfig = {}

  public getResources() {
    return [...this.resources, ...this.dynamicResources]
  }

  public getResourceBySlug(slug: string) {
    return this.getResources().find((r) => r.getSlug() === slug)
  }

  /**
   * Set dashboard
   */
  public setDashboard(dashboard: Dashboard): this {
    this.dashboard = dashboard
    return this
  }

  /**
   * Get dashboard
   */
  public getDashboard(): Dashboard | null {
    return this.dashboard
  }

  public getPages() {
    return [...(this.pages || []), ...this.dynamicPages]
  }

  public getPageBySlug(slug: string) {
    return this.getPages().find((p) => p.slug === slug)
  }

  public getPlugins(): Plugin[] {
    return this.pluginEntries.map((entry) => entry.plugin)
  }

  public getPluginRegistrations(): Array<{ plugin: Plugin; context: PluginRuntimeContext }> {
    return [...this.pluginEntries]
  }

  public setPluginOptions(pluginId: string, options: Record<string, any> = {}): this {
    const normalizedId = normalizePluginId(pluginId)
    if (!normalizedId) return this
    this.pluginOptions.set(normalizedId, { ...(options || {}) })
    return this
  }

  public mergePluginOptions(pluginId: string, options: Record<string, any> = {}): this {
    const normalizedId = normalizePluginId(pluginId)
    if (!normalizedId) return this
    const current = this.pluginOptions.get(normalizedId) || {}
    this.pluginOptions.set(normalizedId, { ...current, ...(options || {}) })
    return this
  }

  public getPluginOptions(pluginId: string): Record<string, any> {
    const normalizedId = normalizePluginId(pluginId)
    if (!normalizedId) return {}
    return { ...(this.pluginOptions.get(normalizedId) || {}) }
  }

  public setPluginManifest(pluginId: string, manifest: PluginManifest | null): this {
    const normalizedId = normalizePluginId(pluginId)
    if (!normalizedId) return this
    this.pluginManifests.set(normalizedId, manifest || null)
    return this
  }

  public getPluginManifest(pluginId: string): PluginManifest | null {
    const normalizedId = normalizePluginId(pluginId)
    if (!normalizedId) return null
    return this.pluginManifests.get(normalizedId) || null
  }

  /**
   * If enabled, plugin resources must set `tenantScoped = true`.
   */
  public requireTenantScopedPluginResources(value: boolean = true): this {
    this.enforceTenantScopedPluginResources = value
    return this
  }

  public addNavigationGroup(group: PanelNavigationGroup): this {
    if (!group?.label || !Array.isArray(group.items)) {
      return this
    }
    this.dynamicNavigationGroups.push({
      label: group.label,
      items: group.items.map((item) => ({
        label: item.label,
        icon: item.icon,
        url: item.url,
        isActive: item.isActive,
      })),
    })
    return this
  }

  public getNavigationGroups(): PanelNavigationGroup[] {
    return [...this.dynamicNavigationGroups]
  }

  public addMiddleware(middlewareFactory: PanelMiddlewareFactory): this {
    this.dynamicMiddlewareFactories.push(middlewareFactory)
    return this
  }

  public getMiddlewareFactories(): PanelMiddlewareFactory[] {
    return [...this.dynamicMiddlewareFactories]
  }

  public addDashboardWidget(widget: Widget): this {
    const widgetId = widget?.getId?.()
    if (!widgetId) return this
    if (!this.dynamicDashboardWidgets.some((existing) => existing.getId() === widgetId)) {
      this.dynamicDashboardWidgets.push(widget)
    }
    return this
  }

  public applyDashboardWidgets(dashboard: Dashboard): Dashboard {
    const existingWidgetIds = new Set(dashboard.getWidgets().map((widget) => widget.getId()))
    for (const widget of this.dynamicDashboardWidgets) {
      if (!existingWidgetIds.has(widget.getId())) {
        dashboard.widget(widget)
      }
    }
    return dashboard
  }

  public addRecordAction(action: Record<string, any>, resourceSlugs?: string[]): this {
    return this.addTableAction('record', action, resourceSlugs)
  }

  public addBulkAction(action: Record<string, any>, resourceSlugs?: string[]): this {
    return this.addTableAction('bulk', action, resourceSlugs)
  }

  public addHeaderAction(action: Record<string, any>, resourceSlugs?: string[]): this {
    return this.addTableAction('header', action, resourceSlugs)
  }

  public getActionRegistrations(): PanelActionRegistration[] {
    return this.dynamicActionRegistrations.map((registration) => ({
      scope: registration.scope,
      action: { ...(registration.action || {}) },
      resourceSlugs: Array.isArray(registration.resourceSlugs)
        ? [...registration.resourceSlugs]
        : undefined,
    }))
  }

  private addTableAction(
    scope: PanelActionScope,
    action: Record<string, any>,
    resourceSlugs?: string[]
  ): this {
    if (!action || typeof action !== 'object') return this

    const normalizedResourceSlugs = Array.isArray(resourceSlugs)
      ? resourceSlugs.map((slug) => String(slug || '').trim()).filter(Boolean)
      : undefined

    this.dynamicActionRegistrations.push({
      scope,
      action: { ...action },
      resourceSlugs:
        normalizedResourceSlugs && normalizedResourceSlugs.length > 0
          ? normalizedResourceSlugs
          : undefined,
    })
    return this
  }

  private shouldApplyActionToResource(
    registration: PanelActionRegistration,
    resourceSlug: string
  ): boolean {
    if (!Array.isArray(registration.resourceSlugs) || registration.resourceSlugs.length === 0) {
      return true
    }
    return registration.resourceSlugs.includes(resourceSlug)
  }

  private buildActionUniqKey(action: Record<string, any>): string {
    return String(action?.name || action?.type || action?.label || JSON.stringify(action || {}))
  }

  private mergeUniqueActions(
    currentActions: Record<string, any>[],
    nextActions: Record<string, any>[]
  ): Record<string, any>[] {
    const merged = [...currentActions]
    const existingKeys = new Set(merged.map((action) => this.buildActionUniqKey(action)))

    for (const action of nextActions) {
      const key = this.buildActionUniqKey(action)
      if (existingKeys.has(key)) continue
      merged.push(action)
      existingKeys.add(key)
    }

    return merged
  }

  private applyDynamicTableActions(
    resource: any,
    schema: Record<string, any>
  ): Record<string, any> {
    const resourceSlug = String(resource?.getSlug?.() || '').trim()
    if (!resourceSlug) return schema

    const scopedRegistrations = this.dynamicActionRegistrations.filter((registration) =>
      this.shouldApplyActionToResource(registration, resourceSlug)
    )
    if (scopedRegistrations.length === 0) return schema

    const recordActions = scopedRegistrations
      .filter((registration) => registration.scope === 'record')
      .map((registration) => ({ ...(registration.action || {}) }))
    const bulkActions = scopedRegistrations
      .filter((registration) => registration.scope === 'bulk')
      .map((registration) => ({ ...(registration.action || {}) }))
    const headerActions = scopedRegistrations
      .filter((registration) => registration.scope === 'header')
      .map((registration) => ({ ...(registration.action || {}) }))

    return {
      ...schema,
      actions: this.mergeUniqueActions(
        Array.isArray(schema.actions) ? schema.actions : [],
        recordActions
      ),
      bulkActions: this.mergeUniqueActions(
        Array.isArray(schema.bulkActions) ? schema.bulkActions : [],
        bulkActions
      ),
      headerActions: this.mergeUniqueActions(
        Array.isArray(schema.headerActions) ? schema.headerActions : [],
        headerActions
      ),
    }
  }

  public addTableSchemaHook(hook: PanelTableSchemaHook): this {
    this.tableSchemaHooks.push(hook)
    return this
  }

  public applyTableSchemaHooks(resource: any, schema: Record<string, any>): Record<string, any> {
    let currentSchema = this.applyDynamicTableActions(resource, { ...schema })
    for (const hook of this.tableSchemaHooks) {
      const nextSchema = hook({ panel: this, resource, schema: currentSchema })
      if (nextSchema && typeof nextSchema === 'object') {
        currentSchema = nextSchema
      }
    }
    return currentSchema
  }

  public reportPluginError(pluginId: string, phase: 'register' | 'boot', error: unknown): this {
    const normalizedId = normalizePluginId(pluginId)
    if (!normalizedId) return this

    this.pluginErrors.push({
      pluginId: normalizedId,
      phase,
      message: String((error as any)?.message || error || 'Unknown plugin error'),
    })

    return this
  }

  public getPluginErrors(): Array<{
    pluginId: string
    phase: 'register' | 'boot'
    message: string
  }> {
    return [...this.pluginErrors]
  }

  /**
   * Restrict panel to this plugin list (by ID).
   */
  public onlyPlugins(pluginIds: string[]): this {
    this.pluginAllowList = new Set(pluginIds.map((id) => normalizePluginId(id)).filter(Boolean))
    return this
  }

  /**
   * Explicitly disable specific plugins (by ID).
   */
  public disablePlugins(pluginIds: string[]): this {
    pluginIds
      .map((id) => normalizePluginId(id))
      .filter(Boolean)
      .forEach((id) => this.pluginBlockList.add(id))
    return this
  }

  /**
   * Re-enable previously disabled plugins (by ID).
   */
  public enablePlugins(pluginIds: string[]): this {
    pluginIds
      .map((id) => normalizePluginId(id))
      .filter(Boolean)
      .forEach((id) => this.pluginBlockList.delete(id))
    return this
  }

  public shouldUsePlugin(pluginId: string): boolean {
    const normalizedId = normalizePluginId(pluginId)
    if (!normalizedId) return false
    if (this.pluginBlockList.has(normalizedId)) return false
    if (this.pluginAllowList && !this.pluginAllowList.has(normalizedId)) return false
    return true
  }

  // ===== PLUGINS =====

  /**
   * Register a plugin
   */
  public plugin(plugin: Plugin, context: Partial<PluginRuntimeContext> = {}): this {
    const pluginId = normalizePluginId(plugin.getId())
    if (!pluginId || !this.shouldUsePlugin(pluginId)) {
      return this
    }

    const runtimeContext: PluginRuntimeContext = {
      id: pluginId,
      source: context.source || 'manual',
      options: {
        ...this.getPluginOptions(pluginId),
        ...(context.options || {}),
      },
      manifest: context.manifest || this.getPluginManifest(pluginId) || null,
    }

    if (typeof plugin.supports === 'function' && !plugin.supports(this, runtimeContext)) {
      return this
    }

    const alreadyRegistered = this.pluginEntries.some(
      (entry) => normalizePluginId(entry.context.id) === pluginId
    )
    if (alreadyRegistered) {
      return this
    }

    const snapshot = {
      resources: [...this.dynamicResources],
      pages: [...this.dynamicPages],
      navigationGroups: [...this.dynamicNavigationGroups],
      middlewareFactories: [...this.dynamicMiddlewareFactories],
      dashboardWidgets: [...this.dynamicDashboardWidgets],
      actionRegistrations: [...this.dynamicActionRegistrations],
      tableSchemaHooks: [...this.tableSchemaHooks],
      options: this.pluginOptions.has(pluginId) ? this.getPluginOptions(pluginId) : null,
      manifest: this.pluginManifests.has(pluginId) ? this.getPluginManifest(pluginId) : null,
    }

    this.setPluginOptions(pluginId, runtimeContext.options)
    this.setPluginManifest(pluginId, runtimeContext.manifest)

    try {
      plugin.register(this, runtimeContext)
    } catch (error) {
      this.dynamicResources = snapshot.resources
      this.dynamicPages = snapshot.pages
      this.dynamicNavigationGroups = snapshot.navigationGroups
      this.dynamicMiddlewareFactories = snapshot.middlewareFactories
      this.dynamicDashboardWidgets = snapshot.dashboardWidgets
      this.dynamicActionRegistrations = snapshot.actionRegistrations
      this.tableSchemaHooks = snapshot.tableSchemaHooks

      if (snapshot.options) {
        this.setPluginOptions(pluginId, snapshot.options)
      } else {
        this.pluginOptions.delete(pluginId)
      }

      if (snapshot.manifest) {
        this.setPluginManifest(pluginId, snapshot.manifest)
      } else {
        this.pluginManifests.delete(pluginId)
      }

      this.reportPluginError(pluginId, 'register', error)
      return this
    }

    this.pluginEntries.push({ plugin, context: runtimeContext })
    return this
  }

  /**
   * Register multiple plugins
   */
  public plugins(plugins: Plugin[]): this {
    plugins.forEach((p) => this.plugin(p))
    return this
  }

  /**
   * Boot panel and its plugins
   */
  public boot(): void {
    if (this.isBooted) return

    this.pluginEntries.forEach(({ plugin, context }) => {
      if (typeof plugin.boot === 'function') {
        try {
          plugin.boot(this, context)
        } catch (error) {
          this.reportPluginError(context.id, 'boot', error)
        }
      }
    })

    this.isBooted = true
  }

  /**
   * Add resource dynamically (used by plugins)
   */
  public addResource(resource: typeof Resource): this {
    const isResourceLike = Boolean(
      resource &&
      typeof resource.getSlug === 'function' &&
      typeof resource.scopedQuery === 'function' &&
      typeof resource.canViewAny === 'function'
    )

    if (!isResourceLike) {
      throw new Error('Invalid plugin resource: expected a Resource subclass')
    }

    if (this.enforceTenantScopedPluginResources && resource.tenantScoped !== true) {
      throw new Error(
        `Plugin resource "${resource.getSlug()}" must define tenantScoped = true on this panel`
      )
    }

    const slug = resource.getSlug()
    if (!this.dynamicResources.some((existing) => existing.getSlug() === slug)) {
      this.dynamicResources.push(resource)
    }
    return this
  }

  /**
   * Add page dynamically (used by plugins)
   */
  public addPage(page: PageConstructor): this {
    if (!this.dynamicPages.some((existing) => existing.slug === page.slug)) {
      this.dynamicPages.push(page)
    }
    return this
  }

  /**
   * Method to override for dashboard configuration
   */
  public configureDashboard(): Dashboard | null {
    return null
  }

  // ===== THEMING =====

  /**
   * Set brand name
   */
  public brandName(name: string): this {
    this.themeConfig.brandName = name
    return this
  }

  /**
   * Set logo
   */
  public brandLogo(config: ThemeConfig['logo']): this {
    this.themeConfig.logo = config
    return this
  }

  /**
   * Set favicon
   */
  public favicon(url: string): this {
    this.themeConfig.favicon = url
    return this
  }

  /**
   * Set theme colors
   */
  public colors(colors: ThemeConfig['colors']): this {
    this.themeConfig.colors = { ...this.themeConfig.colors, ...colors }
    return this
  }

  /**
   * Set primary color
   */
  public primaryColor(hsl: string): this {
    if (!this.themeConfig.colors) this.themeConfig.colors = {}
    this.themeConfig.colors.primary = hsl
    return this
  }

  /**
   * Set dark mode
   */
  public darkMode(mode: ThemeConfig['darkMode']): this {
    this.themeConfig.darkMode = mode
    return this
  }

  /**
   * Injecter du Custom CSS
   */
  public customCss(css: string): this {
    this.themeConfig.customCss = css
    return this
  }

  /**
   * Set font
   */
  public font(config: ThemeConfig['font']): this {
    this.themeConfig.font = config
    return this
  }

  /**
   * Configurer la sidebar
   */
  public sidebar(config: ThemeConfig['sidebar']): this {
    this.themeConfig.sidebar = config
    return this
  }

  /**
   * Get theme configuration
   */
  public getTheme(): ThemeConfig {
    return this.themeConfig
  }

  /**
   * Generate CSS variables for theme
   */
  public generateCssVariables(): string {
    const vars: string[] = []
    const colors = this.themeConfig.colors

    if (colors?.primary) {
      vars.push(`--primary: ${colors.primary};`)
      vars.push(`--primary-foreground: 210 40% 98%;`) // Default light text on primary
    }
    if (colors?.secondary) {
      vars.push(`--secondary: ${colors.secondary};`)
    }
    if (colors?.accent) {
      vars.push(`--accent: ${colors.accent};`)
    }
    if (colors?.danger) {
      vars.push(`--destructive: ${colors.danger};`)
    }
    if (colors?.success) {
      vars.push(`--success: ${colors.success};`)
    }
    if (colors?.warning) {
      vars.push(`--warning: ${colors.warning};`)
    }

    if (this.themeConfig.font?.family) {
      vars.push(`--font-sans: ${this.themeConfig.font.family};`)
    }

    if (this.themeConfig.sidebar?.width) {
      vars.push(`--sidebar-width: ${this.themeConfig.sidebar.width};`)
    }

    return vars.length > 0 ? `:root { ${vars.join(' ')} }` : ''
  }

  /**
   * Serialize theme for frontend
   */
  public serializeTheme(): Record<string, any> {
    return {
      brandName: this.themeConfig.brandName || this.label,
      logo: this.themeConfig.logo,
      favicon: this.themeConfig.favicon,
      colors: this.themeConfig.colors,
      darkMode: this.themeConfig.darkMode || 'class',
      font: this.themeConfig.font,
      sidebar: this.themeConfig.sidebar,
      customCss: this.themeConfig.customCss,
      cssVariables: this.generateCssVariables(),
    }
  }
}
