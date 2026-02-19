import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import encryption from '@adonisjs/core/services/encryption'
import { compose } from '@adonisjs/core/helpers'
import {
  BaseModel,
  column,
  hasMany,
  manyToMany,
  belongsTo,
  beforeCreate,
  beforeFind,
  beforeFetch,
} from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { assignTenantOnCreate, applyTenantScope } from '../traits/belongs_to_tenant.js'
import Post from '#models/post'
import Role from '#models/role'
import Tenant from '#models/tenant'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

const MFA_SECRET_ENCRYPTION_PURPOSE = 'filament-mfa-secret'

function encryptMfaSecret(secret: string | null): string | null {
  if (typeof secret !== 'string' || secret.length === 0) {
    return secret
  }

  try {
    const encrypted = encryption?.encrypt?.(secret, undefined, MFA_SECRET_ENCRYPTION_PURPOSE)
    return typeof encrypted === 'string' ? encrypted : secret
  } catch {
    return secret
  }
}

function decryptMfaSecret(value: string | null): string | null {
  if (typeof value !== 'string' || value.length === 0) {
    return value
  }

  try {
    const decrypted = encryption?.decrypt<string>(value, MFA_SECRET_ENCRYPTION_PURPOSE)
    return typeof decrypted === 'string' ? decrypted : value
  } catch {
    return value
  }
}

export default class User extends compose(BaseModel, AuthFinder) {
  // Hooks pour multi-tenancy
  @beforeCreate()
  static assignTenant = assignTenantOnCreate

  @beforeFind()
  static scopeTenantFind = applyTenantScope

  @beforeFetch()
  static scopeTenantFetch = applyTenantScope

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'full_name', serializeAs: 'fullName' })
  declare fullName: string | null

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column({
    columnName: 'two_factor_secret',
    serializeAs: null,
    prepare: encryptMfaSecret,
    consume: decryptMfaSecret,
  })
  declare twoFactorSecret: string | null

  @column({ columnName: 'two_factor_recovery_codes', serializeAs: null })
  declare twoFactorRecoveryCodes: string | null

  @column.dateTime({ columnName: 'two_factor_confirmed_at', serializeAs: 'twoFactorConfirmedAt' })
  declare twoFactorConfirmedAt: DateTime | null

  @column({
    columnName: 'is_admin',
    serializeAs: 'isAdmin',
  })
  declare isAdmin: boolean

  @column()
  declare role: string

  // Multi-tenancy
  @column()
  declare tenantId: number | null

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @hasMany(() => Post)
  declare posts: HasMany<typeof Post>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @column.dateTime({ columnName: 'deleted_at' })
  declare deletedAt: DateTime | null

  @manyToMany(() => Role, {
    pivotTable: 'create_role_users',
  })
  declare roles: ManyToMany<typeof Role>

  /**
   * Checks whether user has a specific role (by slug)
   */
  public async hasRole(roleSlug: string): Promise<boolean> {
    const userRoles = await (this as any).related('roles').query().where('slug', roleSlug)
    return userRoles.length > 0
  }

  /**
   * Checks whether user has a specific permission (by slug)
   * through assigned roles
   */
  public async hasPermission(permissionSlug: string): Promise<boolean> {
    // Load roles with permissions
    const userRoles = (await (this as any)
      .related('roles')
      .query()
      .preload('permissions')) as Role[]

    for (const role of userRoles) {
      if (role.slug === 'admin') return true // Super admin bypass
      if (role.permissions.some((p) => p.slug === permissionSlug)) {
        return true
      }
    }

    return false
  }

  /**
   * Alias pour hasPermission
   */
  public async can(permissionSlug: string): Promise<boolean> {
    return this.hasPermission(permissionSlug)
  }

  /**
   * Checks whether MFA is enabled for this user.
   */
  public hasMfaEnabled(): boolean {
    return Boolean(this.twoFactorSecret && this.twoFactorConfirmedAt)
  }
}
