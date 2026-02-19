import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class ActivityLog extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare description: string

  @column()
  declare causer_id: number

  @column()
  declare causer_type: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
