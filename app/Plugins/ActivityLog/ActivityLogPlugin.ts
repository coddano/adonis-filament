import { Panel } from '#filament/Core/Panel'
import { Plugin } from '#filament/Core/Plugin'
import ActivityLogResource from './Resources/ActivityLogResource.js'

export default class ActivityLogPlugin implements Plugin {
  public getId(): string {
    return 'activity-log'
  }

  public register(panel: Panel): void {
    panel.addResource(ActivityLogResource)
  }

  public boot(_panel: Panel): void {
    console.log('ActivityLogPlugin booted')
  }
}
