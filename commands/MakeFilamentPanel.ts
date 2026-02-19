import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import string from '@adonisjs/core/helpers/string'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export default class MakeFilamentPanel extends BaseCommand {
  static commandName = 'make:filament-panel'
  static description = 'Create a new Filament panel'
  static aliases = ['make:panel']

  @args.string({ description: 'Name of the panel' })
  declare name: string

  @flags.string({ description: 'The custom path for the panel' })
  declare path: string

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

  async run() {
    const panelName = string.pascalCase(this.name.replace(/Panel$/i, ''))
    const panelPath = this.path || string.dashCase(panelName)
    const panelId = string.snakeCase(panelName)

    const codemods = await this.createCodemods()
    const panelStub = this.resolveStub('filament/panel.stub')

    try {
      await codemods.makeUsingStub(panelStub.root, panelStub.path, {
        panelName,
        panelPath,
        panelId,
      })
    } catch (error) {
      this.logger.error('Failed to generate panel')
      this.exitCode = 1
      return
    }

    this.logger.success(`Panel ${panelName}Panel created successfully!`)
    this.logger.info('Next steps:')
    this.logger.info(`  1. Register the panel in your Filament provider`)
    this.logger.info(`  2. Visit /${panelPath}`)
  }
}
