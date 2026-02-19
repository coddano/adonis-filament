import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import string from '@adonisjs/core/helpers/string'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { isAbsolute, join, relative } from 'node:path'

export default class MakeFilamentPlugin extends BaseCommand {
  static commandName = 'make:filament-plugin'
  static description = 'Create a new Filament plugin scaffold'
  static aliases = ['make:plugin']

  @args.string({ description: 'Name of the plugin' })
  declare name: string

  @flags.string({ description: 'Custom plugin id (default: dash-case name)' })
  declare id?: string

  @flags.boolean({ description: 'Generate a starter resource inside the plugin', alias: 'r' })
  declare resource: boolean

  @flags.boolean({
    description: 'Scaffold a standalone npm plugin package',
    flagName: 'package',
  })
  declare asPackage: boolean

  @flags.string({
    description: 'NPM package name for --package mode',
    flagName: 'npm-name',
  })
  declare npmName?: string

  @flags.string({
    description: 'Output directory for --package mode (default: plugins/<package-name>)',
    flagName: 'package-dir',
  })
  declare packageDir?: string

  @flags.boolean({
    description: 'Generate a GitHub Actions workflow for npm publish (package mode)',
    showNegatedVariantInHelp: true,
  })
  declare ci?: boolean

  @flags.boolean({
    description: 'Register plugin reference in package.json under adonisAdmin.plugins',
    showNegatedVariantInHelp: true,
  })
  declare register?: boolean

  private resolveStub(stubRelativePath: string) {
    const appStubsRoot = this.app.makePath('stubs')
    if (existsSync(`${appStubsRoot}/${stubRelativePath}`)) {
      return {
        root: appStubsRoot,
        path: stubRelativePath,
      }
    }

    const candidatePackageRoots = [
      fileURLToPath(new URL('../', import.meta.url)),
      fileURLToPath(new URL('../../', import.meta.url)),
    ]

    for (const root of candidatePackageRoots) {
      const packageStubPath = `${root}/stubs/${stubRelativePath}`
      if (existsSync(packageStubPath)) {
        return {
          root,
          path: `stubs/${stubRelativePath}`,
        }
      }
    }

    return {
      root: appStubsRoot,
      path: stubRelativePath,
    }
  }

  public async run() {
    const baseName = string.pascalCase(this.name.replace(/Plugin$/i, ''))
    if (!baseName) {
      this.logger.error('Plugin name is required')
      this.exitCode = 1
      return
    }

    const pluginClassName = `${baseName}Plugin`
    const pluginDirectoryName = baseName
    const pluginId =
      this.id && this.id.trim().length > 0 ? this.id.trim() : string.dashCase(baseName)
    const shouldRegister = this.asPackage ? this.register === true : this.register !== false

    const resourceBaseName = baseName.endsWith('Resource')
      ? baseName.replace(/Resource$/, '')
      : baseName
    const resourceClassName = `${resourceBaseName}Resource`
    const resourceSlug = string.dashCase(string.pluralize(resourceBaseName))

    if (this.asPackage) {
      const packageName = this.npmName?.trim() || `adonis-admin-plugin-${string.dashCase(baseName)}`
      const packageDirectoryName = this.normalizePackageDirectoryName(packageName)
      const outputDir = this.resolvePackageOutputDir(packageDirectoryName)
      const shouldGenerateCi = this.ci !== false

      if (existsSync(outputDir)) {
        this.logger.error(`Output directory already exists: ${outputDir}`)
        this.exitCode = 1
        return
      }

      await this.scaffoldStandalonePackage({
        outputDir,
        packageName,
        pluginClassName,
        pluginId,
        resourceClassName,
        resourceSlug,
        resourceLabel: string.pluralize(resourceBaseName),
        resourceSingularLabel: resourceBaseName,
        icon: this.getDefaultIcon(resourceBaseName),
        generateCi: shouldGenerateCi,
      })

      if (shouldRegister) {
        await this.registerPluginInPackageJson(packageName)
      }

      const relativeOutputDir = this.toAppRelative(outputDir)
      this.logger.success(`Standalone plugin package ${packageName} created successfully`)
      this.logger.info('Next steps:')
      let step = 1
      this.logger.info(`  ${step}. cd ${relativeOutputDir}`)
      step += 1
      this.logger.info(`  ${step}. npm install`)
      step += 1
      this.logger.info(`  ${step}. npm run build`)
      step += 1
      if (shouldGenerateCi) {
        this.logger.info(`  ${step}. Set GitHub secret NPM_TOKEN before running release workflow`)
        step += 1
      }
      if (!shouldRegister) {
        this.logger.info(
          `  ${step}. Install it in your Adonis app and add "${packageName}" in dependencies`
        )
        step += 1
      }
      this.logger.info(`  ${step}. Restart your Adonis server to trigger plugin discovery`)
      return
    }

    const pluginRelativeImportPath = `./app/Plugins/${pluginDirectoryName}/${pluginClassName}.js`

    const codemods = await this.createCodemods()
    const pluginStub = this.resolveStub('filament/plugin.stub')
    const pluginManifestStub = this.resolveStub('filament/plugin_manifest.stub')

    await codemods.makeUsingStub(pluginStub.root, pluginStub.path, {
      pluginClassName,
      pluginDirectoryName,
      pluginId,
      hasStarterResource: this.resource,
      resourceClassName,
    })

    if (this.resource) {
      const pluginResourceStub = this.resolveStub('filament/plugin_resource.stub')
      await codemods.makeUsingStub(pluginResourceStub.root, pluginResourceStub.path, {
        pluginClassName,
        pluginDirectoryName,
        resourceClassName,
        resourceSlug,
        resourceLabel: string.pluralize(resourceBaseName),
        resourceSingularLabel: resourceBaseName,
        icon: this.getDefaultIcon(resourceBaseName),
      })
    }

    await codemods.makeUsingStub(pluginManifestStub.root, pluginManifestStub.path, {
      pluginClassName,
      pluginDirectoryName,
      pluginId,
      pluginName: baseName,
    })

    if (shouldRegister) {
      await this.registerPluginInPackageJson(pluginRelativeImportPath)
    }

    this.logger.success(`Plugin ${pluginClassName} created successfully`)
    this.logger.info('Next steps:')
    let step = 1
    if (!shouldRegister) {
      this.logger.info(
        `  ${step}. Add "${pluginRelativeImportPath}" to package.json > adonisAdmin.plugins`
      )
      step += 1
    }
    this.logger.info(`  ${step}. Restart your server to trigger plugin discovery`)
    step += 1

    if (this.resource) {
      this.logger.info(
        `  ${step}. Replace placeholder model in app/Plugins/${pluginDirectoryName}/Resources/${resourceClassName}.ts`
      )
    }
  }

  private getDefaultIcon(name: string): string {
    const lower = name.toLowerCase()
    if (lower.includes('log') || lower.includes('audit')) return 'activity'
    if (lower.includes('user')) return 'users'
    if (lower.includes('setting') || lower.includes('config')) return 'settings'
    return 'puzzle'
  }

  private normalizePackageDirectoryName(packageName: string): string {
    return packageName.replace(/^@/, '').replace(/[\/\\]+/g, '-')
  }

  private resolvePackageOutputDir(packageDirectoryName: string): string {
    if (this.packageDir && this.packageDir.trim().length > 0) {
      const trimmed = this.packageDir.trim()
      return isAbsolute(trimmed) ? trimmed : this.app.makePath(trimmed)
    }

    return this.app.makePath('plugins', packageDirectoryName)
  }

  private toAppRelative(path: string): string {
    const rel = relative(this.app.makePath(), path)
    return rel && !rel.startsWith('..') ? rel : path
  }

  private async scaffoldStandalonePackage(options: {
    outputDir: string
    packageName: string
    pluginClassName: string
    pluginId: string
    resourceClassName: string
    resourceSlug: string
    resourceLabel: string
    resourceSingularLabel: string
    icon: string
    generateCi: boolean
  }) {
    const srcDir = join(options.outputDir, 'src')
    const resourcesDir = join(srcDir, 'resources')
    const workflowDir = join(options.outputDir, '.github', 'workflows')

    await mkdir(srcDir, { recursive: true })
    if (this.resource) {
      await mkdir(resourcesDir, { recursive: true })
    }
    if (options.generateCi) {
      await mkdir(workflowDir, { recursive: true })
    }

    const packageJson = {
      name: options.packageName,
      version: '0.1.0',
      description: `${options.pluginClassName} for Adonis Admin Engine`,
      type: 'module',
      main: './dist/index.js',
      exports: {
        '.': './dist/index.js',
      },
      files: ['dist', 'README.md'],
      scripts: {
        build: 'tsc -p tsconfig.json',
        prepublishOnly: 'npm run build',
      },
      peerDependencies: {
        'adonis-admin-engine': '*',
      },
      devDependencies: {
        typescript: '^5.8.0',
      },
      adonisAdminPlugin: {
        id: options.pluginId,
        engine: '>=0.0.0',
        assets: [],
        migrations: [],
      },
    }

    const tsconfigJson = {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        skipLibCheck: true,
        declaration: true,
        outDir: 'dist',
        rootDir: 'src',
      },
      include: ['src/**/*.ts'],
    }

    const indexContent = this.getStandaloneIndexContent(
      options.pluginClassName,
      options.pluginId,
      options.resourceClassName
    )
    const readmeContent = this.getStandaloneReadmeContent(
      options.packageName,
      options.pluginClassName,
      options.pluginId
    )
    const ciWorkflowContent = this.getStandalonePublishWorkflowContent()

    await writeFile(
      join(options.outputDir, 'package.json'),
      `${JSON.stringify(packageJson, null, 2)}\n`
    )
    await writeFile(
      join(options.outputDir, 'tsconfig.json'),
      `${JSON.stringify(tsconfigJson, null, 2)}\n`
    )
    await writeFile(join(options.outputDir, '.gitignore'), 'node_modules/\ndist/\n')
    await writeFile(join(options.outputDir, 'README.md'), readmeContent)
    await writeFile(join(srcDir, 'index.ts'), indexContent)
    if (options.generateCi) {
      await writeFile(join(workflowDir, 'publish.yml'), ciWorkflowContent)
    }

    if (this.resource) {
      const resourceContent = this.getStandaloneResourceContent({
        resourceClassName: options.resourceClassName,
        resourceSlug: options.resourceSlug,
        resourceLabel: options.resourceLabel,
        resourceSingularLabel: options.resourceSingularLabel,
        icon: options.icon,
      })
      await writeFile(join(resourcesDir, `${options.resourceClassName}.ts`), resourceContent)
    }
  }

  private getStandaloneIndexContent(
    pluginClassName: string,
    pluginId: string,
    resourceClassName: string
  ): string {
    const resourceImport = this.resource
      ? `import ${resourceClassName} from './resources/${resourceClassName}.js'\n`
      : ''
    const registerBody = this.resource
      ? `    panel.addResource(${resourceClassName})`
      : `    // panel.addResource(...)
    // panel.addPage(...)`

    return `import type { Panel } from 'adonis-admin-engine/Filament/Core/Panel'
import type { Plugin, PluginRuntimeContext } from 'adonis-admin-engine/Filament/Core/Plugin'
${resourceImport}
export default class ${pluginClassName} implements Plugin {
  public getId(): string {
    return '${pluginId}'
  }

  public register(panel: Panel, _context?: PluginRuntimeContext): void {
${registerBody}
    // panel.addNavigationGroup({ label: 'Plugin', items: [] })
    // panel.addHeaderAction({ name: 'sync', label: 'Sync' })
    // panel.addRecordAction({ name: 'archive', label: 'Archive' })
    // panel.addBulkAction({ name: 'bulk-archive', label: 'Archive bulk' })
    // panel.addMiddleware(async () => ...)
  }

  public boot(_panel: Panel, _context?: PluginRuntimeContext): void {
    // Optional hook
  }
}
`
  }

  private getStandaloneResourceContent(options: {
    resourceClassName: string
    resourceSlug: string
    resourceLabel: string
    resourceSingularLabel: string
    icon: string
  }): string {
    return `import { Resource } from 'adonis-admin-engine/Filament/Core/Resource'
import { Form } from 'adonis-admin-engine/Filament/Forms/Form'
import { Table } from 'adonis-admin-engine/Filament/Tables/Table'
import { TextInput } from 'adonis-admin-engine/Filament/Forms/Components/TextInput'
import { TextColumn } from 'adonis-admin-engine/Filament/Tables/Columns/TextColumn'

export default class ${options.resourceClassName} extends Resource {
  // Replace with a real Lucid model from the host app
  public static model = null as any

  public static slug = '${options.resourceSlug}'
  public static navigationIcon = '${options.icon}'
  public static navigationLabel = '${options.resourceLabel}'
  public static singularLabel = '${options.resourceSingularLabel}'

  public static form(form: Form): Form {
    return form.schema([
      TextInput.make('name').required(),
    ])
  }

  public static table(table: Table): Table {
    return table
      .columns([
        TextColumn.make('id').sortable(),
        TextColumn.make('name').searchable(),
      ])
      .defaultSort('id', 'desc')
  }
}
`
  }

  private getStandaloneReadmeContent(
    packageName: string,
    pluginClassName: string,
    pluginId: string
  ): string {
    return `# ${packageName}

${pluginClassName} plugin for Adonis Admin Engine.

## Build

\`\`\`bash
npm install
npm run build
\`\`\`

## Publish

\`\`\`bash
npm publish --access public
\`\`\`

## Install In Adonis App

1. Install the package in your Adonis app:

\`\`\`bash
npm install ${packageName}
\`\`\`

2. If your package name does not match the default discovery prefixes, add it explicitly in \`package.json\`:

\`\`\`json
{
  "adonisAdmin": {
    "plugins": ["${packageName}"]
  }
}
\`\`\`

Plugin ID: \`${pluginId}\`
`
  }

  private getStandalonePublishWorkflowContent(): string {
    return `name: Publish

on:
  workflow_dispatch:
  push:
    tags:
      - 'v*'

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'

      - name: Install
        run: npm ci

      - name: Build
        run: npm run build

      - name: Publish
        run: npm publish --access public --provenance
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
`
  }

  private async registerPluginInPackageJson(pluginPath: string) {
    const packageJsonPath = this.app.makePath('package.json')
    let packageJsonRaw = ''

    try {
      packageJsonRaw = await readFile(packageJsonPath, 'utf-8')
    } catch {
      this.logger.warning('Could not read package.json, plugin not auto-registered')
      return
    }

    let packageJson: Record<string, any>
    try {
      packageJson = JSON.parse(packageJsonRaw)
    } catch {
      this.logger.warning('Invalid package.json JSON, plugin not auto-registered')
      return
    }

    if (!packageJson.adonisAdmin || typeof packageJson.adonisAdmin !== 'object') {
      packageJson.adonisAdmin = {}
    }

    const currentPlugins = Array.isArray(packageJson.adonisAdmin.plugins)
      ? packageJson.adonisAdmin.plugins.filter(
          (item: unknown): item is string => typeof item === 'string'
        )
      : []

    if (currentPlugins.includes(pluginPath)) {
      this.logger.info(`Plugin already registered in package.json: ${pluginPath}`)
      return
    }

    currentPlugins.push(pluginPath)
    packageJson.adonisAdmin.plugins = currentPlugins

    await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
    this.logger.success(`Registered plugin in package.json: ${pluginPath}`)
  }
}
