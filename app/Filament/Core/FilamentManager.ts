import { getCurrentTenant, serializeTenant } from '../Support/Tenancy.js'
import { Panel } from './Panel.js'
import { HttpContext } from '@adonisjs/core/http'
import { access, copyFile, cp, mkdir, readFile, stat } from 'node:fs/promises'
import { constants as fsConstants, existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PluginEvent, PluginManifest, normalizePluginId, resolvePluginCandidate } from './Plugin.js'

export interface PageConstructor {
  slug: string
  label: string
  icon: string
  new (): any
}

export interface NavigationItem {
  label: string
  icon: string
  url: string
  isActive: boolean
}

export interface NavigationGroup {
  label: string
  items: NavigationItem[]
}

export interface PluginDiscoveryOptions {
  /**
   * Host project root directory (used to read package.json and resolve modules).
   */
  cwd?: string

  /**
   * Explicit plugin modules to import (e.g. ["./app/Plugins/MyPlugin.js"]).
   */
  specifiers?: string[]

  /**
   * If true, also scan package.json dependencies by prefixes.
   */
  includeDependencies?: boolean

  /**
   * Auto-discovered package prefixes.
   */
  packagePrefixes?: string[]
}

export interface PluginDiscoverySummary {
  attempted: string[]
  loaded: string[]
  failed: Array<{ specifier: string; error: string }>
}

export interface PanelPluginRuntimeConfig {
  onlyPlugins?: string[]
  disablePlugins?: string[]
  enablePlugins?: string[]
  pluginOptions?: Record<string, Record<string, any>>
  security?: {
    requireTenantScopedPluginResources?: boolean
  }
}

export interface PublishablePluginEntry {
  pluginId: string
  source: string
  manifest: PluginManifest
  options: Record<string, any>
  assets: string[]
  migrations: string[]
}

export interface PluginPublishOptions {
  cwd?: string
  targetRoot?: string
  panelId?: string
  pluginIds?: string[]
  assetsDir?: string
  migrationsDir?: string
  overwrite?: boolean
  dryRun?: boolean
}

export interface PluginPublishItemResult {
  pluginId: string
  kind: 'asset' | 'migration'
  sourcePath: string
  destinationPath: string
}

export interface PluginPublishErrorResult {
  pluginId: string
  kind: 'asset' | 'migration'
  sourcePath: string
  error: string
}

export interface PluginPublishSkipResult {
  pluginId: string
  kind: 'asset' | 'migration'
  sourcePath: string
  reason: string
}

export interface PluginPublishSummary {
  candidates: PublishablePluginEntry[]
  published: PluginPublishItemResult[]
  skipped: PluginPublishSkipResult[]
  errors: PluginPublishErrorResult[]
}

type GlobalPluginEntry = {
  id: string
  source: string
  manifest: PluginManifest | null
  options: Record<string, any>
  factory: () => ReturnType<typeof resolvePluginCandidate>
}

const DEFAULT_PLUGIN_PACKAGE_PREFIXES = [
  'adonis-admin-plugin-',
  '@adonis-admin/plugin-',
  'adonis-filament-plugin-',
  '@adonis-filament/plugin-',
]

export class FilamentManager {
  protected panels: Map<string, Panel> = new Map()
  protected globalPlugins: Map<string, GlobalPluginEntry> = new Map()
  protected hostPackageJson: Record<string, any> | null = null
  protected panelRuntimeConfig: Map<string, PanelPluginRuntimeConfig> = new Map()
  protected readonly engineVersion: string = this.resolveEngineVersion()

  public registerPanel(id: string, panel: Panel) {
    this.panels.set(id, panel)
    this.applyPanelRuntimeConfig(panel)

    for (const entry of this.globalPlugins.values()) {
      this.attachPluginToPanel(panel, entry)
    }

    return this
  }

  public registerGlobalPlugin(
    pluginCandidate: unknown,
    source: string = 'manual',
    context: { manifest?: PluginManifest | null; options?: Record<string, any> } = {}
  ) {
    this.registerGlobalPluginInternal(pluginCandidate, source, context)
    return this
  }

  public registerGlobalPlugins(pluginCandidates: unknown[], source: string = 'manual') {
    for (const candidate of pluginCandidates) {
      this.registerGlobalPlugin(candidate, source)
    }
    return this
  }

  private registerGlobalPluginInternal(
    pluginCandidate: unknown,
    source: string = 'manual',
    context: { manifest?: PluginManifest | null; options?: Record<string, any> } = {}
  ): { registered: boolean; pluginId?: string; error?: string } {
    const factory = this.createPluginFactory(pluginCandidate)
    if (!factory) return { registered: false, error: 'Invalid plugin (factory not found)' }

    const probeInstance = factory()
    if (!probeInstance) return { registered: false, error: 'Invalid plugin (instance not found)' }

    const pluginId = normalizePluginId(probeInstance.getId())
    if (!pluginId) {
      return { registered: false, error: 'Invalid plugin (empty id)' }
    }

    const manifest = this.normalizeManifest(context.manifest || null, source, pluginId)
    if (manifest?.id && normalizePluginId(manifest.id) !== pluginId) {
      return {
        registered: false,
        pluginId,
        error: `Manifest id "${manifest.id}" does not match plugin.getId()="${pluginId}"`,
      }
    }

    const compatibility = this.checkManifestCompatibility(manifest)
    if (!compatibility.ok) {
      return {
        registered: false,
        pluginId,
        error: compatibility.error || 'Plugin incompatible',
      }
    }

    if (this.globalPlugins.has(pluginId)) {
      return { registered: false, pluginId, error: `Plugin "${pluginId}" is already registered` }
    }

    const entry: GlobalPluginEntry = {
      id: pluginId,
      source,
      manifest,
      options: { ...(context.options || {}) },
      factory,
    }
    this.globalPlugins.set(pluginId, entry)

    for (const panel of this.getPanels()) {
      this.attachPluginToPanel(panel, entry)
    }

    return { registered: true, pluginId }
  }

  public async discoverPlugins(
    options: PluginDiscoveryOptions = {}
  ): Promise<PluginDiscoverySummary> {
    const cwd = resolve(options.cwd || process.cwd())
    const packageJson = await this.readPackageJson(cwd)
    this.hostPackageJson = packageJson
    this.panelRuntimeConfig = this.extractPanelRuntimeConfig(packageJson)
    for (const panel of this.getPanels()) {
      this.applyPanelRuntimeConfig(panel)
    }

    const includeDependencies = options.includeDependencies !== false
    const packagePrefixes =
      Array.isArray(options.packagePrefixes) && options.packagePrefixes.length > 0
        ? options.packagePrefixes
        : DEFAULT_PLUGIN_PACKAGE_PREFIXES

    const explicitSpecifiers = Array.isArray(options.specifiers)
      ? options.specifiers.filter(
          (item): item is string => typeof item === 'string' && item.trim().length > 0
        )
      : []

    const packageFieldSpecifiers = packageJson
      ? this.extractPackageFieldPluginSpecifiers(packageJson)
      : []

    const dependencySpecifiers =
      packageJson && includeDependencies
        ? this.extractDependencyPluginSpecifiers(packageJson, packagePrefixes)
        : []

    const specifiers = Array.from(
      new Set([...explicitSpecifiers, ...packageFieldSpecifiers, ...dependencySpecifiers])
    )

    const summary: PluginDiscoverySummary = {
      attempted: specifiers,
      loaded: [],
      failed: [],
    }

    const requireFromCwd = createRequire(resolve(cwd, 'package.json'))

    for (const specifier of specifiers) {
      try {
        const importTarget = await this.resolveImportTarget(specifier, cwd, requireFromCwd)
        const pluginModule = await import(importTarget)
        const moduleManifest = await this.resolveModuleManifest({
          specifier,
          pluginModule,
          cwd,
          requireFromCwd,
        })
        const loadedResult = this.registerPluginsFromModule(pluginModule, specifier, {
          packageJson,
          manifest: moduleManifest,
        })

        if (loadedResult.registeredCount > 0) {
          summary.loaded.push(specifier)
        } else {
          summary.failed.push({
            specifier,
            error:
              loadedResult.errors[0] ||
              'No plugin export found (expected exports: default, plugin, plugins[])',
          })
        }
      } catch (error: any) {
        summary.failed.push({
          specifier,
          error: String(error?.message || error || 'Unknown error'),
        })
      }
    }

    return summary
  }

  public getPanel(id: string) {
    return this.panels.get(id)
  }

  public getPanels() {
    return Array.from(this.panels.values())
  }

  public getEngineVersion() {
    return this.engineVersion
  }

  public getRegisteredPlugins() {
    return Array.from(this.globalPlugins.values()).map((entry) => ({
      id: entry.id,
      source: entry.source,
      manifest: entry.manifest,
      options: { ...entry.options },
    }))
  }

  public getPublishablePlugins(
    options: { panelId?: string; pluginIds?: string[] } = {}
  ): PublishablePluginEntry[] {
    const panel = options.panelId ? this.getPanel(options.panelId) : null
    if (options.panelId && !panel) return []

    const panelPluginIds = panel
      ? new Set(
          panel
            .getPluginRegistrations()
            .map((registration) => normalizePluginId(registration.context.id))
        )
      : null
    const selectedPluginIds =
      Array.isArray(options.pluginIds) && options.pluginIds.length > 0
        ? new Set(options.pluginIds.map((id) => normalizePluginId(id)).filter(Boolean))
        : null

    const publishables: PublishablePluginEntry[] = []

    for (const entry of this.globalPlugins.values()) {
      if (!entry.manifest) continue
      if (selectedPluginIds && !selectedPluginIds.has(entry.id)) continue
      if (panelPluginIds && !panelPluginIds.has(entry.id)) continue

      const assets = this.normalizeManifestPathList(entry.manifest.assets)
      const migrations = this.normalizeManifestPathList(entry.manifest.migrations)
      if (assets.length === 0 && migrations.length === 0) continue

      publishables.push({
        pluginId: entry.id,
        source: entry.source,
        manifest: entry.manifest,
        options: panel
          ? { ...entry.options, ...panel.getPluginOptions(entry.id) }
          : { ...entry.options },
        assets,
        migrations,
      })
    }

    return publishables
  }

  public async publishPluginFiles(
    options: PluginPublishOptions = {}
  ): Promise<PluginPublishSummary> {
    const cwd = resolve(options.cwd || process.cwd())
    const targetRoot = resolve(options.targetRoot || cwd)
    const overwrite = options.overwrite === true
    const dryRun = options.dryRun === true

    const candidates = this.getPublishablePlugins({
      panelId: options.panelId,
      pluginIds: options.pluginIds,
    })

    const summary: PluginPublishSummary = {
      candidates,
      published: [],
      skipped: [],
      errors: [],
    }

    if (candidates.length === 0) {
      return summary
    }

    const requireFromCwd = createRequire(resolve(cwd, 'package.json'))

    for (const candidate of candidates) {
      const sourceRoot = await this.resolvePluginSourceRoot(candidate.source, cwd, requireFromCwd)
      if (!sourceRoot) {
        for (const assetPath of candidate.assets) {
          summary.skipped.push({
            pluginId: candidate.pluginId,
            kind: 'asset',
            sourcePath: assetPath,
            reason: `Plugin source could not be resolved: ${candidate.source}`,
          })
        }
        for (const migrationPath of candidate.migrations) {
          summary.skipped.push({
            pluginId: candidate.pluginId,
            kind: 'migration',
            sourcePath: migrationPath,
            reason: `Plugin source could not be resolved: ${candidate.source}`,
          })
        }
        continue
      }

      const publishOverrides =
        candidate.options?.publish && typeof candidate.options.publish === 'object'
          ? (candidate.options.publish as Record<string, any>)
          : {}

      const assetsDestinationRoot = this.resolvePublishDestinationRoot(
        targetRoot,
        publishOverrides.assetsDir ??
          options.assetsDir ??
          `resources/vendor/adonis-admin/${candidate.pluginId}`
      )
      const migrationsDestinationRoot = this.resolvePublishDestinationRoot(
        targetRoot,
        publishOverrides.migrationsDir ??
          options.migrationsDir ??
          `database/migrations/vendor/${candidate.pluginId}`
      )

      for (const assetPath of candidate.assets) {
        await this.publishPath({
          pluginId: candidate.pluginId,
          kind: 'asset',
          sourceRoot,
          declaredPath: assetPath,
          destinationRoot: assetsDestinationRoot,
          overwrite,
          dryRun,
          summary,
        })
      }

      for (const migrationPath of candidate.migrations) {
        await this.publishPath({
          pluginId: candidate.pluginId,
          kind: 'migration',
          sourceRoot,
          declaredPath: migrationPath,
          destinationRoot: migrationsDestinationRoot,
          overwrite,
          dryRun,
          summary,
        })
      }
    }

    return summary
  }

  public async emitPanelEvent(
    panel: Panel,
    name: string,
    payload: Record<string, any> = {},
    options: { failFast?: boolean } = {}
  ): Promise<Record<string, any>> {
    const failFast = options.failFast !== false

    for (const registration of panel.getPluginRegistrations()) {
      const plugin = registration.plugin
      const context = registration.context

      if (typeof plugin.onEvent !== 'function') {
        continue
      }

      try {
        const event: PluginEvent = {
          name,
          panel,
          context,
          payload,
        }
        await plugin.onEvent(event)
      } catch (error) {
        if (failFast) {
          throw error
        }
      }
    }

    return payload
  }

  private createPluginFactory(
    pluginCandidate: unknown
  ): (() => ReturnType<typeof resolvePluginCandidate>) | null {
    if (typeof pluginCandidate === 'function') {
      return () => resolvePluginCandidate(pluginCandidate)
    }

    const instance = resolvePluginCandidate(pluginCandidate)
    if (!instance) return null

    return () => instance
  }

  private attachPluginToPanel(panel: Panel, entry: GlobalPluginEntry) {
    if (!panel.shouldUsePlugin(entry.id)) {
      return
    }

    const plugin = entry.factory()
    if (!plugin) {
      return
    }

    panel.plugin(plugin, {
      id: entry.id,
      source: entry.source,
      options: entry.options,
      manifest: entry.manifest,
    })
  }

  private normalizeManifestPathList(values: unknown): string[] {
    if (!Array.isArray(values)) return []

    return values.map((value) => String(value || '').trim()).filter((value) => value.length > 0)
  }

  private resolvePublishDestinationRoot(targetRoot: string, destinationPath: string): string {
    const trimmed = String(destinationPath || '').trim()
    if (!trimmed) return targetRoot
    return isAbsolute(trimmed) ? trimmed : resolve(targetRoot, trimmed)
  }

  private sanitizeManifestRelativePath(declaredPath: string): string | null {
    const trimmed = String(declaredPath || '').trim()
    if (!trimmed || isAbsolute(trimmed)) {
      return null
    }

    const virtualRoot = '/__plugin_publish_root__'
    const resolvedPath = resolve(virtualRoot, trimmed)
    const relativePath = relative(virtualRoot, resolvedPath)
    if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) {
      return null
    }

    return relativePath
  }

  private isPathInsideRoot(rootPath: string, targetPath: string): boolean {
    const rel = relative(rootPath, targetPath)
    if (rel === '') return true
    return !rel.startsWith('..') && !isAbsolute(rel)
  }

  private async resolvePluginSourceRoot(
    source: string,
    cwd: string,
    requireFromCwd: NodeRequire
  ): Promise<string | null> {
    const sourceSpecifier = String(source || '').trim()
    if (!sourceSpecifier) return null

    const resolveToDirectory = async (candidatePath: string): Promise<string | null> => {
      if (!(await this.fileExists(candidatePath))) return null

      try {
        const fileStats = await stat(candidatePath)
        return fileStats.isDirectory() ? candidatePath : dirname(candidatePath)
      } catch {
        return null
      }
    }

    if (sourceSpecifier.startsWith('file:')) {
      try {
        const filePath = fileURLToPath(sourceSpecifier)
        return resolveToDirectory(filePath)
      } catch {
        return null
      }
    }

    const isPackageSpecifier = !sourceSpecifier.startsWith('.') && !isAbsolute(sourceSpecifier)

    if (isPackageSpecifier) {
      try {
        const packageJsonPath = requireFromCwd.resolve(`${sourceSpecifier}/package.json`)
        const directoryPath = await resolveToDirectory(packageJsonPath)
        if (directoryPath) return directoryPath
      } catch {
        // continue
      }

      try {
        const moduleEntryPath = requireFromCwd.resolve(sourceSpecifier)
        const directoryPath = await resolveToDirectory(moduleEntryPath)
        if (directoryPath) return directoryPath
      } catch {
        // continue
      }

      const nodeModulesPath = resolve(cwd, 'node_modules', sourceSpecifier)
      const directoryPath = await resolveToDirectory(nodeModulesPath)
      if (directoryPath) return directoryPath

      return null
    }

    const basePath = isAbsolute(sourceSpecifier) ? sourceSpecifier : resolve(cwd, sourceSpecifier)
    const candidates = [
      basePath,
      `${basePath}.js`,
      `${basePath}.mjs`,
      `${basePath}.cjs`,
      `${basePath}.ts`,
      resolve(basePath, 'index.js'),
      resolve(basePath, 'index.mjs'),
      resolve(basePath, 'index.cjs'),
      resolve(basePath, 'index.ts'),
    ]

    for (const candidate of candidates) {
      const directoryPath = await resolveToDirectory(candidate)
      if (directoryPath) return directoryPath
    }

    return null
  }

  private async publishPath(options: {
    pluginId: string
    kind: 'asset' | 'migration'
    sourceRoot: string
    declaredPath: string
    destinationRoot: string
    overwrite: boolean
    dryRun: boolean
    summary: PluginPublishSummary
  }): Promise<void> {
    const {
      pluginId,
      kind,
      sourceRoot,
      declaredPath,
      destinationRoot,
      overwrite,
      dryRun,
      summary,
    } = options

    const relativePath = this.sanitizeManifestRelativePath(declaredPath)
    if (!relativePath) {
      summary.skipped.push({
        pluginId,
        kind,
        sourcePath: declaredPath,
        reason: 'Invalid path (must be relative to plugin root)',
      })
      return
    }

    const sourcePath = resolve(sourceRoot, relativePath)
    if (!this.isPathInsideRoot(sourceRoot, sourcePath)) {
      summary.skipped.push({
        pluginId,
        kind,
        sourcePath: declaredPath,
        reason: 'Source path is outside plugin root (path traversal blocked)',
      })
      return
    }

    if (!(await this.fileExists(sourcePath))) {
      summary.errors.push({
        pluginId,
        kind,
        sourcePath: declaredPath,
        error: `Source path not found: ${sourcePath}`,
      })
      return
    }

    const destinationPath = resolve(destinationRoot, relativePath)
    if (!this.isPathInsideRoot(destinationRoot, destinationPath)) {
      summary.skipped.push({
        pluginId,
        kind,
        sourcePath: declaredPath,
        reason: 'Invalid destination path',
      })
      return
    }

    if (!overwrite && (await this.fileExists(destinationPath))) {
      summary.skipped.push({
        pluginId,
        kind,
        sourcePath: declaredPath,
        reason: `Destination already exists: ${destinationPath}`,
      })
      return
    }

    try {
      if (!dryRun) {
        const sourceStats = await stat(sourcePath)
        await mkdir(dirname(destinationPath), { recursive: true })

        if (sourceStats.isDirectory()) {
          await cp(sourcePath, destinationPath, {
            recursive: true,
            force: overwrite,
            errorOnExist: !overwrite,
          })
        } else {
          await copyFile(sourcePath, destinationPath)
        }
      }

      summary.published.push({
        pluginId,
        kind,
        sourcePath,
        destinationPath,
      })
    } catch (error: any) {
      summary.errors.push({
        pluginId,
        kind,
        sourcePath,
        error: String(error?.message || error || 'Unknown publish error'),
      })
    }
  }

  private async readPackageJson(cwd: string): Promise<Record<string, any> | null> {
    try {
      const packageJsonPath = resolve(cwd, 'package.json')
      const raw = await readFile(packageJsonPath, 'utf-8')
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
      return null
    }
  }

  private resolveEngineVersion(): string {
    const baseDir = dirname(fileURLToPath(import.meta.url))
    let currentDir = baseDir

    for (let i = 0; i < 10; i++) {
      const packageJsonPath = resolve(currentDir, 'package.json')
      if (existsSync(packageJsonPath)) {
        try {
          const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
          if (parsed?.name === 'adonis-admin-engine' && typeof parsed?.version === 'string') {
            return parsed.version
          }
        } catch {
          // continue
        }
      }
      currentDir = resolve(currentDir, '..')
    }

    return '0.0.0'
  }

  private normalizeManifest(
    manifest: PluginManifest | null,
    source: string,
    pluginId: string
  ): PluginManifest | null {
    if (!manifest) return null

    return {
      id: manifest.id || pluginId,
      name: manifest.name,
      version: manifest.version,
      engine: manifest.engine,
      assets: Array.isArray(manifest.assets) ? [...manifest.assets] : undefined,
      migrations: Array.isArray(manifest.migrations) ? [...manifest.migrations] : undefined,
      source,
    } as PluginManifest & { source: string }
  }

  private checkManifestCompatibility(manifest: PluginManifest | null): {
    ok: boolean
    error?: string
  } {
    if (!manifest?.engine || manifest.engine === '*') {
      return { ok: true }
    }

    if (this.satisfiesEngineRange(this.engineVersion, manifest.engine)) {
      return { ok: true }
    }

    return {
      ok: false,
      error: `Plugin incompatible: engine requis "${manifest.engine}", moteur courant "${this.engineVersion}"`,
    }
  }

  private parseVersion(version: string): { major: number; minor: number; patch: number } | null {
    const match = String(version || '')
      .trim()
      .match(/^(\d+)\.(\d+)\.(\d+)/)
    if (!match) return null
    return {
      major: Number(match[1]),
      minor: Number(match[2]),
      patch: Number(match[3]),
    }
  }

  private compareVersion(a: string, b: string): number {
    const aParsed = this.parseVersion(a)
    const bParsed = this.parseVersion(b)
    if (!aParsed || !bParsed) return 0

    if (aParsed.major !== bParsed.major) return aParsed.major > bParsed.major ? 1 : -1
    if (aParsed.minor !== bParsed.minor) return aParsed.minor > bParsed.minor ? 1 : -1
    if (aParsed.patch !== bParsed.patch) return aParsed.patch > bParsed.patch ? 1 : -1
    return 0
  }

  private satisfiesEngineRange(currentVersion: string, range: string): boolean {
    const trimmedRange = String(range || '').trim()
    if (!trimmedRange || trimmedRange === '*') return true
    if (!this.parseVersion(currentVersion)) return false

    if (trimmedRange.startsWith('>=')) {
      const minVersion = trimmedRange.slice(2).trim()
      if (!this.parseVersion(minVersion)) return false
      return this.compareVersion(currentVersion, minVersion) >= 0
    }

    if (trimmedRange.startsWith('^')) {
      const base = trimmedRange.slice(1).trim()
      const parsed = this.parseVersion(base)
      if (!parsed) return false
      return (
        this.compareVersion(currentVersion, base) >= 0 &&
        this.parseVersion(currentVersion)?.major === parsed.major
      )
    }

    if (trimmedRange.startsWith('~')) {
      const base = trimmedRange.slice(1).trim()
      const parsed = this.parseVersion(base)
      if (!parsed) return false
      const currentParsed = this.parseVersion(currentVersion)
      if (!currentParsed) return false
      return (
        this.compareVersion(currentVersion, base) >= 0 &&
        currentParsed.major === parsed.major &&
        currentParsed.minor === parsed.minor
      )
    }

    if (!this.parseVersion(trimmedRange)) return false
    return this.compareVersion(currentVersion, trimmedRange) === 0
  }

  private extractGlobalPluginOptions(
    packageJson: Record<string, any> | null
  ): Record<string, Record<string, any>> {
    const options = packageJson?.adonisAdmin?.pluginOptions
    if (!options || typeof options !== 'object') return {}

    const result: Record<string, Record<string, any>> = {}
    for (const [key, value] of Object.entries(options)) {
      if (!value || typeof value !== 'object') continue
      result[key] = { ...(value as Record<string, any>) }
    }
    return result
  }

  private resolvePluginOptions(
    packageJson: Record<string, any> | null,
    specifier: string,
    pluginId: string
  ): Record<string, any> {
    const allOptions = this.extractGlobalPluginOptions(packageJson)
    const bySpecifier = allOptions[specifier] || {}
    const byId = allOptions[pluginId] || {}
    return { ...bySpecifier, ...byId }
  }

  private extractPanelRuntimeConfig(
    packageJson: Record<string, any> | null
  ): Map<string, PanelPluginRuntimeConfig> {
    const panelConfig = packageJson?.adonisAdmin?.panels || packageJson?.filament?.panels
    const map = new Map<string, PanelPluginRuntimeConfig>()
    if (!panelConfig || typeof panelConfig !== 'object') return map

    for (const [panelId, value] of Object.entries(panelConfig)) {
      if (!value || typeof value !== 'object') continue
      map.set(panelId, value as PanelPluginRuntimeConfig)
    }

    return map
  }

  private applyPanelRuntimeConfig(panel: Panel): void {
    const config = this.panelRuntimeConfig.get(panel.id)
    if (!config) return

    if (Array.isArray(config.onlyPlugins) && config.onlyPlugins.length > 0) {
      panel.onlyPlugins(config.onlyPlugins)
    }

    if (Array.isArray(config.disablePlugins) && config.disablePlugins.length > 0) {
      panel.disablePlugins(config.disablePlugins)
    }

    if (Array.isArray(config.enablePlugins) && config.enablePlugins.length > 0) {
      panel.enablePlugins(config.enablePlugins)
    }

    if (config.pluginOptions && typeof config.pluginOptions === 'object') {
      for (const [pluginId, pluginOptions] of Object.entries(config.pluginOptions)) {
        if (pluginOptions && typeof pluginOptions === 'object') {
          panel.mergePluginOptions(pluginId, pluginOptions as Record<string, any>)
        }
      }
    }

    if (config.security?.requireTenantScopedPluginResources === true) {
      panel.requireTenantScopedPluginResources(true)
    }
  }

  private extractPackageFieldPluginSpecifiers(packageJson: Record<string, any>): string[] {
    const values: string[] = []
    const adonisAdminPlugins = packageJson?.adonisAdmin?.plugins
    const filamentPlugins = packageJson?.filament?.plugins

    for (const entry of [adonisAdminPlugins, filamentPlugins]) {
      if (!Array.isArray(entry)) continue
      for (const item of entry) {
        if (typeof item === 'string' && item.trim().length > 0) {
          values.push(item.trim())
        }
      }
    }

    return values
  }

  private extractDependencyPluginSpecifiers(
    packageJson: Record<string, any>,
    packagePrefixes: string[]
  ): string[] {
    const packageNames = new Set<string>()
    const dependencyBlocks = ['dependencies', 'optionalDependencies', 'devDependencies'] as const

    for (const block of dependencyBlocks) {
      const entries = packageJson?.[block]
      if (!entries || typeof entries !== 'object') continue
      for (const packageName of Object.keys(entries)) {
        if (packagePrefixes.some((prefix) => packageName.startsWith(prefix))) {
          packageNames.add(packageName)
        }
      }
    }

    return Array.from(packageNames)
  }

  private async resolveImportTarget(
    specifier: string,
    cwd: string,
    requireFromCwd: NodeRequire
  ): Promise<string> {
    if (specifier.startsWith('file:')) {
      return specifier
    }

    try {
      const resolved = requireFromCwd.resolve(specifier)
      return pathToFileURL(resolved).href
    } catch {
      const basePath = isAbsolute(specifier) ? specifier : resolve(cwd, specifier)
      const fileCandidates = [
        basePath,
        `${basePath}.js`,
        `${basePath}.mjs`,
        `${basePath}.cjs`,
        `${basePath}.ts`,
        resolve(basePath, 'index.js'),
        resolve(basePath, 'index.mjs'),
        resolve(basePath, 'index.cjs'),
        resolve(basePath, 'index.ts'),
      ]

      for (const candidate of fileCandidates) {
        if (await this.fileExists(candidate)) {
          return pathToFileURL(candidate).href
        }
      }

      throw new Error(`Module introuvable: ${specifier}`)
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath, fsConstants.F_OK)
      return true
    } catch {
      return false
    }
  }

  private async resolveModuleManifest(options: {
    specifier: string
    pluginModule: Record<string, unknown>
    cwd: string
    requireFromCwd: NodeRequire
  }): Promise<PluginManifest | null> {
    const { specifier, pluginModule, cwd, requireFromCwd } = options

    const exportedManifest = (pluginModule as any)?.manifest
    const moduleManifest =
      exportedManifest && typeof exportedManifest === 'object'
        ? ({ ...(exportedManifest as Record<string, any>) } as PluginManifest)
        : null

    const isPackageSpecifier =
      !specifier.startsWith('.') && !isAbsolute(specifier) && !specifier.startsWith('file:')
    if (!isPackageSpecifier) {
      return moduleManifest
    }

    const packageJsonCandidates: string[] = []
    try {
      packageJsonCandidates.push(requireFromCwd.resolve(`${specifier}/package.json`))
    } catch {
      // ignore
    }
    packageJsonCandidates.push(resolve(cwd, 'node_modules', specifier, 'package.json'))

    for (const candidate of packageJsonCandidates) {
      if (!(await this.fileExists(candidate))) continue
      try {
        const raw = await readFile(candidate, 'utf-8')
        const parsed = JSON.parse(raw)
        const packageManifest =
          parsed?.adonisAdminPlugin && typeof parsed.adonisAdminPlugin === 'object'
            ? parsed.adonisAdminPlugin
            : null

        return {
          ...(packageManifest || {}),
          ...(moduleManifest || {}),
          name: moduleManifest?.name || packageManifest?.name || parsed?.name,
          version: moduleManifest?.version || packageManifest?.version || parsed?.version,
        }
      } catch {
        // continue
      }
    }

    return moduleManifest
  }

  private registerPluginsFromModule(
    pluginModule: Record<string, unknown>,
    source: string,
    options: { packageJson: Record<string, any> | null; manifest: PluginManifest | null }
  ): { registeredCount: number; errors: string[] } {
    const candidates: unknown[] = []
    const errors: string[] = []

    if ('default' in pluginModule) {
      candidates.push((pluginModule as any).default)
    }

    if ('plugin' in pluginModule) {
      candidates.push((pluginModule as any).plugin)
    }

    if (Array.isArray((pluginModule as any).plugins)) {
      candidates.push(...(pluginModule as any).plugins)
    }

    let registeredCount = 0
    for (const candidate of candidates) {
      const probeInstance = resolvePluginCandidate(candidate)
      if (!probeInstance) {
        errors.push('Invalid plugin export (instance not found)')
        continue
      }

      const pluginId = normalizePluginId(probeInstance.getId())
      const resolvedOptions = this.resolvePluginOptions(options.packageJson, source, pluginId)
      const result = this.registerGlobalPluginInternal(candidate, source, {
        manifest: options.manifest,
        options: resolvedOptions,
      })

      if (result.registered) {
        registeredCount += 1
      } else if (result.error) {
        errors.push(result.error)
      }
    }

    return {
      registeredCount,
      errors,
    }
  }

  public getCurrentPanel(currentPath: string) {
    return this.getPanels().find((p) => currentPath.startsWith(p.path))
  }

  /**
   * Build navigation for a panel
   */
  public getNavigationData(panelId: string, currentPath: string): NavigationGroup[] {
    const panel = this.getPanel(panelId)
    if (!panel) return []

    const items: NavigationItem[] = panel.getResources().map((resource: any) => ({
      label: resource.getNavigationLabel(),
      icon: resource.navigationIcon || 'circle',
      url: `${panel.path}/${resource.getSlug()}`,
      isActive: currentPath.includes(`/${resource.getSlug()}`),
    }))

    const navigation: NavigationGroup[] = [
      {
        label: 'Management',
        items,
      },
    ]

    const pluginGroups = panel.getNavigationGroups().map((group) => ({
      label: group.label,
      items: group.items.map((item) => ({
        label: item.label,
        icon: item.icon || 'circle',
        url: item.url,
        isActive: item.isActive ?? currentPath.startsWith(item.url),
      })),
    }))

    navigation.push(...pluginGroups)
    return navigation
  }

  /**
   * Get shared data for Inertia
   */
  public getSharedData(currentPath: string) {
    const currentPanel = this.getCurrentPanel(currentPath)
    const tenant = getCurrentTenant()
    const ctx = HttpContext.get()
    const availableTenants = Array.isArray((ctx as any)?.availableTenants)
      ? (ctx as any).availableTenants
      : []

    let theme = currentPanel ? currentPanel.serializeTheme() : null

    // If tenant branding exists, override theme
    if (tenant && theme) {
      const branding = tenant.getBrandingForTheme?.() || {}

      // Merge configurations
      theme = {
        ...theme,
        brandName: branding.brandName || theme.brandName,
        logo: branding.logo
          ? {
              light: branding.logo.light || theme.logo?.light,
              dark: branding.logo.dark || theme.logo?.dark,
            }
          : theme.logo,
        colors: {
          ...(theme.colors || {}),
          primary: branding.primaryColor || theme.colors?.primary,
        },
      }
    }

    return {
      filament: {
        currentPanel: currentPanel
          ? {
              id: currentPanel.id,
              path: currentPanel.path,
            }
          : null,
        navigation: currentPanel ? this.getNavigationData(currentPanel.id, currentPath) : [],
        panels: this.getPanels().map((p) => ({
          id: p.id,
          path: p.path,
        })),
        // Theme configuration
        theme,
        // Tenant context
        tenant: serializeTenant(tenant as any),
        tenancy: {
          current: serializeTenant(tenant as any),
          available: availableTenants.map((item: any) => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
            domain: item.domain,
            status: item.status,
          })),
        },
      },
    }
  }

  public routes(router: any) {
    for (const panel of this.getPanels()) {
      // Boot panel and plugins before registering routes
      panel.boot()

      router
        .group(() => {
          // Dashboard
          router.get('/', [() => import('./DashboardController.js'), 'index']).as('dashboard')
          // Dashboard Widget API (for polling)
          router
            .get('/widget/:widgetId', [() => import('./DashboardController.js'), 'getWidget'])
            .as('widget')
          // Global Search
          router
            .get('/global-search', [() => import('./AdminController.js'), 'globalSearch'])
            .as('globalSearch')
          // Tenancy switching
          router
            .post('/tenancy/switch', [() => import('./AdminController.js'), 'switchTenant'])
            .as('tenancy.switch')
          router
            .post('/tenancy/clear', [() => import('./AdminController.js'), 'clearTenant'])
            .as('tenancy.clear')
          // MFA
          router
            .get('/mfa/challenge', [() => import('./AdminController.js'), 'mfaChallenge'])
            .as('mfa.challenge')
          router
            .post('/mfa/challenge', [() => import('./AdminController.js'), 'verifyMfaChallenge'])
            .as('mfa.challenge.verify')
          router
            .get('/security/mfa', [() => import('./AdminController.js'), 'mfaSettings'])
            .as('mfa.settings')
          router
            .post('/security/mfa/setup', [() => import('./AdminController.js'), 'setupMfa'])
            .as('mfa.setup')
          router
            .post('/security/mfa/confirm', [() => import('./AdminController.js'), 'confirmMfa'])
            .as('mfa.confirm')
          router
            .post('/security/mfa/disable', [() => import('./AdminController.js'), 'disableMfa'])
            .as('mfa.disable')
          router
            .post('/security/mfa/recovery-codes', [
              () => import('./AdminController.js'),
              'regenerateMfaRecoveryCodes',
            ])
            .as('mfa.recovery')

          // Resources
          for (const resource of panel.getResources()) {
            const slug = resource.getSlug()
            router
              .group(() => {
                router.get('/', [() => import('./AdminController.js'), 'index']).as('index')
                router.get('/create', [() => import('./AdminController.js'), 'create']).as('create')
                router.post('/', [() => import('./AdminController.js'), 'store']).as('store')
                // Bulk actions (static routes before parameterized routes)
                router
                  .delete('/bulk', [() => import('./AdminController.js'), 'bulkDestroy'])
                  .as('bulkDestroy')
                // Export
                router
                  .get('/export/:format', [() => import('./AdminController.js'), 'export'])
                  .as('export')
                // Import
                router
                  .post('/import', [() => import('./AdminController.js'), 'import'])
                  .as('import')
                // View
                router.get('/:id', [() => import('./AdminController.js'), 'show']).as('show')
                router.get('/:id/edit', [() => import('./AdminController.js'), 'edit']).as('edit')
                router.put('/:id', [() => import('./AdminController.js'), 'update']).as('update')
                router
                  .delete('/:id', [() => import('./AdminController.js'), 'destroy'])
                  .as('destroy')
                if (resource.softDeletes) {
                  router
                    .post('/:id/restore', [() => import('./AdminController.js'), 'restore'])
                    .as('restore')
                  router
                    .delete('/:id/force', [() => import('./AdminController.js'), 'forceDestroy'])
                    .as('forceDestroy')
                }
                // Clone
                router
                  .post('/:id/clone', [() => import('./AdminController.js'), 'clone'])
                  .as('clone')
              })
              .prefix(slug)
              .as(slug)
          }

          // Pages
          for (const page of panel.getPages()) {
            const slug = page.slug
            router
              .group(() => {
                router.get('/', [() => import('./AdminController.js'), 'page']).as('index')
                router.post('/', [() => import('./AdminController.js'), 'savePage']).as('save')
              })
              .prefix(slug)
              .as(slug)
          }
        })
        .prefix(panel.path)
        .as(panel.id)
        .use(async () => {
          const { middleware } = await import('#start/kernel')
          const pluginMiddlewares = []
          for (const middlewareFactory of panel.getMiddlewareFactories()) {
            pluginMiddlewares.push(await middlewareFactory())
          }
          return [
            middleware.auth(),
            middleware.tenantResolver(),
            middleware.mfa(),
            ...pluginMiddlewares,
          ]
        })
    }
  }
}

const filament = new FilamentManager()
export default filament
