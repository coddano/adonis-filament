import { HttpContext } from '@adonisjs/core/http'

export interface TenantLike {
  id: number
  name?: string | null
  slug?: string | null
  domain?: string | null
  status?: string | null
  isActive?: () => boolean
  getBrandingForTheme?: () => {
    brandName?: string
    logo?: { light?: string; dark?: string }
    primaryColor?: string
  }
}

export type TenantResolver = (
  tenantId: number,
  context: HttpContext
) => Promise<TenantLike | null> | TenantLike | null

let customTenantResolver: TenantResolver | null = null

export function configureTenantResolver(resolver: TenantResolver | null) {
  customTenantResolver = resolver
}

export function getCurrentTenant(): TenantLike | null {
  const ctx = HttpContext.get()
  if (!ctx) return null
  return ((ctx as any).tenant || null) as TenantLike | null
}

export function getCurrentTenantId(): number | null {
  const tenant = getCurrentTenant()
  const id = Number((tenant as any)?.id)
  return Number.isInteger(id) && id > 0 ? id : null
}

export function getAvailableTenants(context?: HttpContext): TenantLike[] {
  const ctx = context || HttpContext.get()
  if (!ctx) return []

  const tenants = (ctx as any).availableTenants
  if (!Array.isArray(tenants)) return []
  return tenants as TenantLike[]
}

export function isTenantActive(tenant: TenantLike | null): boolean {
  if (!tenant) return false

  if (typeof tenant.isActive === 'function') {
    return Boolean(tenant.isActive())
  }

  const status = String(tenant.status || '').toLowerCase()
  if (!status) return true
  return status === 'active'
}

export function serializeTenant(tenant: TenantLike | null): Record<string, any> | null {
  if (!tenant) return null

  return {
    id: tenant.id,
    name: tenant.name ?? null,
    slug: tenant.slug ?? null,
    domain: tenant.domain ?? null,
    status: tenant.status ?? null,
  }
}

export async function resolveTenantById(
  tenantId: number,
  context?: HttpContext
): Promise<TenantLike | null> {
  const ctx = context || HttpContext.get()
  if (!ctx || !Number.isInteger(tenantId) || tenantId <= 0) {
    return null
  }

  if (customTenantResolver) {
    return (await customTenantResolver(tenantId, ctx)) || null
  }

  const availableTenants = getAvailableTenants(ctx)
  const fromAvailable = availableTenants.find((tenant) => Number(tenant.id) === tenantId)
  if (fromAvailable) {
    return fromAvailable
  }

  const currentTenant = getCurrentTenant()
  if (Number(currentTenant?.id) === tenantId) {
    return currentTenant
  }

  const authUser = (ctx as any)?.auth?.user as any
  if (authUser && Number(authUser.tenantId) === tenantId) {
    return {
      id: tenantId,
      name: authUser.tenant?.name || null,
      slug: authUser.tenant?.slug || null,
      domain: authUser.tenant?.domain || null,
      status: authUser.tenant?.status || null,
    }
  }

  return null
}
