import type { NextFn } from '@adonisjs/core/types/http'
import { HttpContext } from '@adonisjs/core/http'
import Tenant from '#models/tenant'

/**
 * TenantContext - Helper to access current tenant in a thread-safe way
 * Utilise HttpContext (AsyncLocalStorage) sous le capot
 */
export class TenantContext {
  static get(): Tenant | null {
    // Get current HttpContext (AsyncLocalStorage)
    const ctx = HttpContext.get()

    if (!ctx) return null

    // Tenant is stored in custom context properties
    return (ctx as any).tenant || null
  }

  static getId(): number | null {
    const tenant = this.get()
    return tenant?.id || null
  }
}

/**
 * TenantResolverMiddleware
 *
 * Resolve current tenant using multiple strategies:
 * 1. Sous-domaine (ex: acme.admin.app)
 * 2. Custom domain (e.g. admin.acme.com)
 * 3. Signed-in user tenant
 * 4. Header X-Tenant-ID (pour API)
 */
export default class TenantResolverMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { request, auth, response, session } = ctx

    let tenant: Tenant | null = null

    // Strategy 0: Tenant stored in session (manual switch from panel)
    const sessionTenantId = Number(session.get('filament.current_tenant_id') || 0)
    if (sessionTenantId > 0) {
      const sessionTenant = await Tenant.find(sessionTenantId)
      if (sessionTenant && sessionTenant.isActive()) {
        tenant = sessionTenant
      } else {
        session.forget('filament.current_tenant_id')
      }
    }

    // Strategy 1: X-Tenant-ID header (API)
    const tenantIdHeader = request.header('X-Tenant-ID')
    if (!tenant && tenantIdHeader) {
      tenant = await Tenant.find(Number.parseInt(tenantIdHeader, 10))
    }

    // Strategy 2: Subdomain
    if (!tenant) {
      const host = request.host() || ''
      const subdomain = this.extractSubdomain(host)
      if (subdomain) {
        tenant = await Tenant.findBy('slug', subdomain)
      }
    }

    // Strategy 3: Custom domain
    if (!tenant) {
      const host = request.host() || ''
      tenant = await Tenant.findBy('domain', host)
    }

    // Strategy 4: Signed-in user tenant
    if (!tenant && auth.user) {
      const user = auth.user as any
      if (user.tenantId) {
        tenant = await Tenant.find(user.tenantId)
      }
    }

    const user = auth.user as any
    let availableTenants: Tenant[] = []

    if (user) {
      if (user.isAdmin) {
        availableTenants = await Tenant.query().where('status', 'active').orderBy('name', 'asc')
      } else if (user.tenantId) {
        const ownTenant = await Tenant.find(user.tenantId)
        if (ownTenant && ownTenant.isActive()) {
          availableTenants = [ownTenant]
          if (tenant && tenant.id !== ownTenant.id) {
            tenant = ownTenant
          }
          if (!tenant) {
            tenant = ownTenant
          }
        }
      }
    }

    // Tenant status check
    if (tenant && !tenant.isActive()) {
      return response.forbidden({
        message: 'Ce compte est suspendu ou inactif.',
      })
    }

    // Store tenant in request context
    // @ts-ignore
    ctx.tenant = tenant
    // @ts-ignore
    ctx.availableTenants = availableTenants

    // Share with views (if needed)
    if ('view' in ctx) {
      ctx.view.share({ currentTenant: tenant, availableTenants })
    }

    await next()
  }

  /**
   * Extract subdomain from host
   * Ex: "acme.admin.example.com" -> "acme"
   */
  private extractSubdomain(host: string): string | null {
    // Remove port when present
    const hostWithoutPort = host.split(':')[0]

    // Config: domaine de base de l'application
    const baseDomain = process.env.APP_DOMAIN || 'localhost'

    // Si localhost ou IP, pas de sous-domaine
    if (hostWithoutPort === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostWithoutPort)) {
      return null
    }

    // Check whether host contains base domain
    if (!hostWithoutPort.endsWith(baseDomain)) {
      return null
    }

    // Extraire le sous-domaine
    const subdomain = hostWithoutPort.replace(`.${baseDomain}`, '').split('.')[0]

    // Ignore reserved subdomains
    const reserved = ['www', 'api', 'admin', 'app']
    if (reserved.includes(subdomain)) {
      return null
    }

    return subdomain || null
  }
}

/**
 * Helper to access tenant in models/services
 */
export function getCurrentTenant(): Tenant | null {
  return TenantContext.get()
}

export function getCurrentTenantId(): number | null {
  return TenantContext.getId()
}
