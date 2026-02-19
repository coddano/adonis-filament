import { BaseCommand, flags } from '@adonisjs/core/ace'
import filament from '../app/Filament/Core/FilamentManager.js'

export default class PublishFilamentPlugins extends BaseCommand {
  public static commandName = 'filament:plugin:publish'
  public static description = 'Publish plugin assets and migrations from plugin manifests'

  @flags.string({ description: 'Filter by panel id' })
  declare panel?: string

  @flags.string({ description: 'Comma-separated plugin ids to publish' })
  declare plugins?: string

  @flags.string({ description: 'Target root directory (default: app root)' })
  declare targetRoot?: string

  @flags.string({ description: 'Override destination directory for assets' })
  declare assetsDir?: string

  @flags.string({ description: 'Override destination directory for migrations' })
  declare migrationsDir?: string

  @flags.boolean({ description: 'Overwrite existing files', showNegatedVariantInHelp: true })
  declare overwrite?: boolean

  @flags.boolean({ description: 'Only print planned changes without writing files' })
  declare dryRun: boolean

  private parsePluginIds(raw?: string): string[] | undefined {
    if (!raw) return undefined
    const values = raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    return values.length > 0 ? values : undefined
  }

  public async run() {
    if (filament.getRegisteredPlugins().length === 0) {
      await filament.discoverPlugins({ cwd: this.app.makePath() })
    }

    const summary = await filament.publishPluginFiles({
      cwd: this.app.makePath(),
      panelId: this.panel,
      pluginIds: this.parsePluginIds(this.plugins),
      targetRoot: this.targetRoot,
      assetsDir: this.assetsDir,
      migrationsDir: this.migrationsDir,
      overwrite: this.overwrite === true,
      dryRun: this.dryRun === true,
    })

    this.logger.info(`Publishable plugins: ${summary.candidates.length}`)
    this.logger.info(`Published files: ${summary.published.length}`)
    this.logger.info(`Skipped files: ${summary.skipped.length}`)
    this.logger.info(`Errors: ${summary.errors.length}`)

    if (summary.skipped.length > 0) {
      for (const skipped of summary.skipped.slice(0, 20)) {
        this.logger.warning(
          `[${skipped.pluginId}] ${skipped.kind} "${skipped.sourcePath}" skipped: ${skipped.reason}`
        )
      }
      if (summary.skipped.length > 20) {
        this.logger.warning(`... ${summary.skipped.length - 20} additional skipped entries`)
      }
    }

    if (summary.errors.length > 0) {
      for (const failure of summary.errors.slice(0, 20)) {
        this.logger.error(
          `[${failure.pluginId}] ${failure.kind} "${failure.sourcePath}" error: ${failure.error}`
        )
      }
      if (summary.errors.length > 20) {
        this.logger.error(`... ${summary.errors.length - 20} additional errors`)
      }
      this.exitCode = 1
      return
    }

    if (this.dryRun) {
      this.logger.success('Dry run completed')
      return
    }

    this.logger.success('Plugin publish completed')
  }
}
