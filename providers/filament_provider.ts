import { ApplicationService } from '@adonisjs/core/types'
import filament from '../app/Filament/Core/FilamentManager.js'
import AdminPanel from '../app/Admin/Panels/AdminPanel.js'

export default class FilamentProvider {
  constructor(protected app: ApplicationService) {}

  public async boot() {
    await filament.discoverPlugins({
      cwd: this.app.makePath(),
    })

    /**
     * Register panels
     */
    filament.registerPanel('admin', new AdminPanel())
  }
}
