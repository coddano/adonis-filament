import { test } from '@japa/runner'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import os from 'node:os'
import { FilamentManager } from '#filament/Core/FilamentManager'
import { Panel } from '#filament/Core/Panel'
import { Dashboard } from '#filament/Core/Dashboard'
import type { Plugin } from '#filament/Core/Plugin'
import { Widget } from '#filament/Widgets/Widget'

class PluginPage {
  static slug = 'plugin-page'
  static label = 'Plugin Page'
  static icon = 'star'
}

class SecondaryPluginPage {
  static slug = 'secondary-plugin-page'
  static label = 'Secondary Plugin Page'
  static icon = 'sparkles'
}

class TestPanel extends Panel {
  public id: string
  public path: string
  public resources = []
  public pages = []

  constructor(
    config: { id?: string; path?: string; onlyPlugins?: string[]; disablePlugins?: string[] } = {}
  ) {
    super()
    this.id = config.id || 'test-admin'
    this.path = config.path || '/test-admin'

    if (Array.isArray(config.onlyPlugins) && config.onlyPlugins.length > 0) {
      this.onlyPlugins(config.onlyPlugins)
    }
    if (Array.isArray(config.disablePlugins) && config.disablePlugins.length > 0) {
      this.disablePlugins(config.disablePlugins)
    }
  }
}

class PagePlugin implements Plugin {
  public getId() {
    return 'page-plugin'
  }

  public register(panel: Panel): void {
    panel.addPage(PluginPage as any)
  }
}

class SecondaryPagePlugin implements Plugin {
  public getId() {
    return 'secondary-plugin'
  }

  public register(panel: Panel): void {
    panel.addPage(SecondaryPluginPage as any)
  }
}

class FailingRegisterPlugin implements Plugin {
  public getId() {
    return 'failing-plugin'
  }

  public register(_panel: Panel): void {
    throw new Error('plugin register crash')
  }
}

class EventRecorderPlugin implements Plugin {
  private readonly sink: Array<{ name: string; payload: Record<string, any> }>
  private readonly shouldThrow: boolean

  constructor(
    sink: Array<{ name: string; payload: Record<string, any> }>,
    shouldThrow: boolean = false
  ) {
    this.sink = sink
    this.shouldThrow = shouldThrow
  }

  public getId() {
    return this.shouldThrow ? 'event-thrower' : 'event-recorder'
  }

  public register(_panel: Panel): void {}

  public onEvent(event: any): void {
    if (this.shouldThrow) {
      throw new Error('event crash')
    }

    this.sink.push({ name: event.name, payload: { ...event.payload } })
    event.payload.modifiedBy = this.getId()
  }
}

class TenantUnsafePluginResource {
  public static tenantScoped = false
  public static getSlug() {
    return 'tenant-unsafe'
  }
  public static scopedQuery() {
    return {}
  }
  public static canViewAny() {
    return true
  }
}

class TenantUnsafePlugin implements Plugin {
  public getId() {
    return 'tenant-unsafe-plugin'
  }

  public register(panel: Panel): void {
    panel.addResource(TenantUnsafePluginResource as any)
  }
}

class DummyWidget extends Widget {
  public getType(): string {
    return 'dummy'
  }

  public async getData(): Promise<Record<string, any>> {
    return { ok: true }
  }
}

async function writeJson(filePath: string, value: Record<string, any>) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

test.group('FilamentManager plugins', () => {
  test('registerGlobalPlugin automatically applies plugin to panels', async ({ assert }) => {
    const manager = new FilamentManager()
    manager.registerGlobalPlugin(new PagePlugin())

    const panel = new TestPanel()
    manager.registerPanel(panel.id, panel)

    assert.isTrue(panel.getPageBySlug('plugin-page') !== undefined)
    assert.equal(panel.getPlugins().length, 1)
    assert.equal(panel.getPlugins()[0].getId(), 'page-plugin')
  })

  test('onlyPlugins and disablePlugins filter plugins by panel', async ({ assert }) => {
    const manager = new FilamentManager()
    manager.registerGlobalPlugin(new PagePlugin())
    manager.registerGlobalPlugin(new SecondaryPagePlugin())

    const panel = new TestPanel({
      onlyPlugins: ['page-plugin', 'secondary-plugin'],
      disablePlugins: ['secondary-plugin'],
    })
    manager.registerPanel(panel.id, panel)

    assert.isTrue(panel.getPageBySlug('plugin-page') !== undefined)
    assert.isTrue(panel.getPageBySlug('secondary-plugin-page') === undefined)
    assert.deepEqual(
      panel.getPlugins().map((plugin) => plugin.getId()),
      ['page-plugin']
    )
  })

  test('discoverPlugins loads plugins declared in package.json adonisAdmin.plugins', async ({
    assert,
  }) => {
    const tmpDir = await mkdtemp(join(os.tmpdir(), 'filament-discovery-'))
    const pluginsDir = join(tmpDir, 'plugins')
    await mkdir(pluginsDir, { recursive: true })

    await writeJson(join(tmpDir, 'package.json'), {
      name: 'tmp-app',
      type: 'module',
      adonisAdmin: {
        plugins: ['./plugins/local-plugin.mjs'],
      },
    })

    await writeFile(
      join(pluginsDir, 'local-plugin.mjs'),
      `
export default class LocalPlugin {
  getId() {
    return 'local-plugin'
  }

  register(panel) {
    panel.addPage(class LocalPluginPage {
      static slug = 'local-plugin-page'
      static label = 'Local Plugin Page'
      static icon = 'box'
    })
  }
}
`
    )

    try {
      const manager = new FilamentManager()
      const summary = await manager.discoverPlugins({ cwd: tmpDir })

      const panel = new TestPanel()
      manager.registerPanel(panel.id, panel)

      assert.include(summary.attempted, './plugins/local-plugin.mjs')
      assert.include(summary.loaded, './plugins/local-plugin.mjs')
      assert.isTrue(panel.getPageBySlug('local-plugin-page') !== undefined)
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  })

  test('discoverPlugins auto-detects plugin dependencies by prefix', async ({ assert }) => {
    const tmpDir = await mkdtemp(join(os.tmpdir(), 'filament-dep-discovery-'))
    const pluginPackageDir = join(tmpDir, 'node_modules', 'adonis-admin-plugin-demo')

    await mkdir(pluginPackageDir, { recursive: true })

    await writeJson(join(tmpDir, 'package.json'), {
      name: 'tmp-app',
      type: 'module',
      dependencies: {
        'adonis-admin-plugin-demo': '1.0.0',
      },
    })

    await writeJson(join(pluginPackageDir, 'package.json'), {
      name: 'adonis-admin-plugin-demo',
      version: '1.0.0',
      type: 'module',
      exports: './index.mjs',
    })

    await writeFile(
      join(pluginPackageDir, 'index.mjs'),
      `
export default class DemoPlugin {
  getId() {
    return 'demo-plugin'
  }

  register(panel) {
    panel.addPage(class DemoPluginPage {
      static slug = 'demo-plugin-page'
      static label = 'Demo Plugin Page'
      static icon = 'box'
    })
  }
}
`
    )

    try {
      const manager = new FilamentManager()
      const summary = await manager.discoverPlugins({ cwd: tmpDir })

      const panel = new TestPanel()
      manager.registerPanel(panel.id, panel)

      assert.include(summary.attempted, 'adonis-admin-plugin-demo')
      assert.include(summary.loaded, 'adonis-admin-plugin-demo')
      assert.isTrue(panel.getPageBySlug('demo-plugin-page') !== undefined)
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  })

  test('plugin API adds navigation, middleware, widgets, and table actions', async ({ assert }) => {
    const manager = new FilamentManager()
    const panel = new TestPanel()
    manager.registerPanel(panel.id, panel)

    const extensionPlugin: Plugin = {
      getId() {
        return 'extension-plugin'
      },
      register(targetPanel: Panel) {
        targetPanel
          .addNavigationGroup({
            label: 'Plugin',
            items: [{ label: 'Audit', url: '/test-admin/audit', icon: 'activity' }],
          })
          .addMiddleware(() => 'plugin-middleware')
          .addHeaderAction({ name: 'sync', label: 'Sync' }, ['fake-records'])
          .addRecordAction({ name: 'archive', label: 'Archive' }, ['fake-records'])
          .addBulkAction({ name: 'bulk-archive', label: 'Archive bulk' }, ['fake-records'])
          .addDashboardWidget(new DummyWidget('dummy-widget'))
      },
    }

    manager.registerGlobalPlugin(extensionPlugin)

    assert.equal(panel.getNavigationGroups().length, 1)
    assert.equal(panel.getMiddlewareFactories().length, 1)

    const tableSchema = panel.applyTableSchemaHooks(
      { getSlug: () => 'fake-records' },
      { actions: [], bulkActions: [], headerActions: [] }
    )
    assert.isTrue(Array.isArray(tableSchema.actions))
    assert.isTrue(tableSchema.actions.some((item: any) => item.name === 'archive'))
    assert.isTrue(Array.isArray(tableSchema.bulkActions))
    assert.isTrue(tableSchema.bulkActions.some((item: any) => item.name === 'bulk-archive'))
    assert.isTrue(Array.isArray(tableSchema.headerActions))
    assert.isTrue(tableSchema.headerActions.some((item: any) => item.name === 'sync'))

    const dashboard = Dashboard.make()
    panel.applyDashboardWidgets(dashboard)
    assert.isTrue(dashboard.getWidgets().some((widget) => widget.getId() === 'dummy-widget'))
  })

  test('a plugin crashing during register does not break the panel', async ({ assert }) => {
    const manager = new FilamentManager()
    manager.registerGlobalPlugin(new FailingRegisterPlugin())

    const panel = new TestPanel()
    manager.registerPanel(panel.id, panel)

    assert.equal(panel.getPlugins().length, 0)
    assert.isTrue(
      panel
        .getPluginErrors()
        .some((item) => item.pluginId === 'failing-plugin' && item.phase === 'register')
    )
  })

  test('emitPanelEvent dispatches plugin events and supports failFast=false', async ({
    assert,
  }) => {
    const manager = new FilamentManager()
    const receivedEvents: Array<{ name: string; payload: Record<string, any> }> = []

    manager.registerGlobalPlugin(new EventRecorderPlugin(receivedEvents))
    manager.registerGlobalPlugin(new EventRecorderPlugin([], true))

    const panel = new TestPanel()
    manager.registerPanel(panel.id, panel)

    const payload: Record<string, any> = { hello: 'world' }
    await manager.emitPanelEvent(panel, 'resource.index.before', payload, { failFast: false })

    assert.equal(receivedEvents.length, 1)
    assert.equal(receivedEvents[0].name, 'resource.index.before')
    assert.equal(payload.modifiedBy, 'event-recorder')
  })

  test('incompatible manifests are rejected (engine or mismatched id)', async ({ assert }) => {
    const manager = new FilamentManager()

    manager.registerGlobalPlugin(new PagePlugin(), 'manual', {
      manifest: { id: 'different-id', engine: '>=0.0.0' },
    })
    manager.registerGlobalPlugin(new PagePlugin(), 'manual', {
      manifest: { id: 'page-plugin', engine: 'invalid-range' },
    })
    manager.registerGlobalPlugin(new PagePlugin(), 'manual', {
      manifest: { id: 'page-plugin', engine: '>=999.0.0' },
    })

    assert.equal(manager.getRegisteredPlugins().length, 0)
  })

  test('discoverPlugins applies panel config (disable + pluginOptions)', async ({ assert }) => {
    const tmpDir = await mkdtemp(join(os.tmpdir(), 'filament-panel-runtime-config-'))
    const pluginsDir = join(tmpDir, 'plugins')
    await mkdir(pluginsDir, { recursive: true })

    await writeJson(join(tmpDir, 'package.json'), {
      name: 'tmp-app',
      type: 'module',
      adonisAdmin: {
        plugins: ['./plugins/local-plugin.mjs', './plugins/secondary-plugin.mjs'],
        panels: {
          'test-admin': {
            disablePlugins: ['secondary-plugin'],
            pluginOptions: {
              'local-plugin': {
                enabled: true,
              },
            },
          },
        },
      },
    })

    await writeFile(
      join(pluginsDir, 'local-plugin.mjs'),
      `
export default class LocalPlugin {
  getId() {
    return 'local-plugin'
  }
  register(panel) {
    panel.addPage(class LocalRuntimePage {
      static slug = 'local-runtime-page'
      static label = 'Local Runtime Page'
      static icon = 'box'
    })
  }
}
`
    )

    await writeFile(
      join(pluginsDir, 'secondary-plugin.mjs'),
      `
export default class SecondaryPlugin {
  getId() {
    return 'secondary-plugin'
  }
  register(panel) {
    panel.addPage(class SecondaryRuntimePage {
      static slug = 'secondary-runtime-page'
      static label = 'Secondary Runtime Page'
      static icon = 'box'
    })
  }
}
`
    )

    try {
      const manager = new FilamentManager()
      await manager.discoverPlugins({ cwd: tmpDir })

      const panel = new TestPanel()
      manager.registerPanel(panel.id, panel)

      assert.isTrue(panel.getPageBySlug('local-runtime-page') !== undefined)
      assert.isTrue(panel.getPageBySlug('secondary-runtime-page') === undefined)
      assert.equal(panel.getPluginOptions('local-plugin').enabled, true)
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  })

  test('publishes assets/migrations declared in the plugin manifest', async ({ assert }) => {
    const tmpDir = await mkdtemp(join(os.tmpdir(), 'filament-plugin-publish-'))
    const pluginsDir = join(tmpDir, 'plugins')
    await mkdir(join(pluginsDir, 'assets'), { recursive: true })
    await mkdir(join(pluginsDir, 'migrations'), { recursive: true })

    await writeJson(join(tmpDir, 'package.json'), {
      name: 'tmp-app',
      type: 'module',
      adonisAdmin: {
        plugins: ['./plugins/publish-plugin.mjs'],
        pluginOptions: {
          'publish-plugin': {
            publish: {
              assetsDir: 'resources/published-assets',
              migrationsDir: 'database/published-migrations',
            },
          },
        },
      },
    })

    await writeFile(join(pluginsDir, 'assets', 'logo.txt'), 'logo-content')
    await writeFile(join(pluginsDir, 'migrations', '001_demo.ts'), 'export default {}')

    await writeFile(
      join(pluginsDir, 'publish-plugin.mjs'),
      `
export const manifest = {
  id: 'publish-plugin',
  engine: '>=0.0.0',
  assets: ['assets/logo.txt'],
  migrations: ['migrations/001_demo.ts']
}

export default class PublishPlugin {
  getId() {
    return 'publish-plugin'
  }
  register() {}
}
`
    )

    try {
      const manager = new FilamentManager()
      await manager.discoverPlugins({ cwd: tmpDir })

      const dryRun = await manager.publishPluginFiles({ cwd: tmpDir, dryRun: true })
      assert.equal(dryRun.published.length, 2)
      assert.equal(dryRun.errors.length, 0)

      const publish = await manager.publishPluginFiles({ cwd: tmpDir })
      assert.equal(publish.published.length, 2)
      assert.equal(publish.errors.length, 0)

      const publishedAsset = await readFile(
        join(tmpDir, 'resources', 'published-assets', 'assets', 'logo.txt'),
        'utf-8'
      )
      const publishedMigration = await readFile(
        join(tmpDir, 'database', 'published-migrations', 'migrations', '001_demo.ts'),
        'utf-8'
      )

      assert.equal(publishedAsset, 'logo-content')
      assert.include(publishedMigration, 'export default')
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  })

  test('tenancy security can block non-tenantScoped plugin resources', async ({ assert }) => {
    const manager = new FilamentManager()
    manager.registerGlobalPlugin(new TenantUnsafePlugin())

    class SecurePanel extends TestPanel {
      constructor() {
        super({ id: 'secure-admin', path: '/secure-admin' })
        this.requireTenantScopedPluginResources(true)
      }
    }

    const panel = new SecurePanel()
    manager.registerPanel(panel.id, panel)

    assert.equal(panel.getPlugins().length, 0)
    assert.isTrue(panel.getResourceBySlug('tenant-unsafe') === undefined)
    assert.isTrue(
      panel
        .getPluginErrors()
        .some(
          (item) =>
            item.pluginId === 'tenant-unsafe-plugin' && item.message.includes('tenantScoped')
        )
    )
  })
})
