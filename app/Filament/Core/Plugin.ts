import { Panel } from './Panel.js'

export interface PluginManifest {
  id?: string
  name?: string
  version?: string
  /**
   * Minimum engine version (e.g. ">=0.1.0").
   */
  engine?: string
  /**
   * Publishable paths in host app (optional).
   */
  assets?: string[]
  migrations?: string[]
}

export interface PluginRuntimeContext {
  id: string
  source: string
  options: Record<string, any>
  manifest: PluginManifest | null
}

export interface PluginEvent {
  name: string
  panel: Panel
  context: PluginRuntimeContext
  payload: Record<string, any>
}

export interface Plugin {
  /**
   * Unique plugin id (used for dedupe and per-panel activation).
   */
  getId(): string

  /**
   * Register hook. Called as soon as plugin is attached to a panel.
   */
  register(panel: Panel, context?: PluginRuntimeContext): void

  /**
   * Boot hook. Called during `panel.boot()`.
   */
  boot?(panel: Panel, context?: PluginRuntimeContext): void

  /**
   * Optional filter to declare whether plugin supports this panel.
   */
  supports?(panel: Panel, context?: PluginRuntimeContext): boolean

  /**
   * Global event hook (CRUD, render, auth, etc.).
   */
  onEvent?(event: PluginEvent): Promise<void> | void
}

export type PluginClass = new () => Plugin
export type PluginFactory = () => Plugin
export type PluginCandidate = Plugin | PluginClass | PluginFactory

export function normalizePluginId(id: string): string {
  return String(id || '')
    .trim()
    .toLowerCase()
}

export function isPlugin(value: unknown): value is Plugin {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof (value as any).getId === 'function' &&
    typeof (value as any).register === 'function'
  )
}

/**
 * Resolve exported value (instance, class, factory) into plugin instance.
 */
export function resolvePluginCandidate(candidate: unknown): Plugin | null {
  if (isPlugin(candidate)) {
    return candidate
  }

  if (typeof candidate === 'function') {
    try {
      const maybeClass = candidate as PluginClass & { prototype?: any }
      if (
        maybeClass.prototype &&
        typeof maybeClass.prototype.getId === 'function' &&
        typeof maybeClass.prototype.register === 'function'
      ) {
        const instance = new maybeClass()
        return isPlugin(instance) ? instance : null
      }

      const instance = (candidate as PluginFactory)()
      return isPlugin(instance) ? instance : null
    } catch {
      return null
    }
  }

  return null
}
