import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export type TenantStatus = 'active' | 'inactive' | 'suspended'

export interface TenantSettings {
  maxUsers?: number
  features?: string[]
  [key: string]: any
}

export interface TenantBranding {
  logo?: { light?: string; dark?: string }
  primaryColor?: string
  favicon?: string
  [key: string]: any
}

export default class Tenant extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare slug: string

  @column()
  declare domain: string | null

  @column()
  declare status: TenantStatus

  @column({
    prepare: (value: TenantSettings) => JSON.stringify(value),
    consume: (value: string) => (value ? JSON.parse(value) : {}),
  })
  declare settings: TenantSettings

  @column({
    prepare: (value: TenantBranding) => JSON.stringify(value),
    consume: (value: string) => (value ? JSON.parse(value) : {}),
  })
  declare branding: TenantBranding

  @column()
  declare plan: string

  @column.dateTime()
  declare trialEndsAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ===== RELATIONS =====

  @hasMany(() => User)
  declare users: HasMany<typeof User>

  // ===== HELPERS =====

  /**
   * Checks whether tenant is active
   */
  public isActive(): boolean {
    return this.status === 'active'
  }

  /**
   * Checks whether tenant is in trial period
   */
  public isOnSortal(): boolean {
    if (!this.trialEndsAt) return false
    return this.trialEndsAt > DateTime.now()
  }

  /**
   * Gets a tenant setting
   */
  public getSetting<T = any>(key: string, defaultValue?: T): T {
    return this.settings?.[key] ?? defaultValue
  }

  /**
   * Gets branding information for theming
   */
  public getBrandingForTheme(): Record<string, any> {
    return {
      logo: this.branding?.logo,
      primaryColor: this.branding?.primaryColor,
      favicon: this.branding?.favicon,
      brandName: this.name,
    }
  }
}
