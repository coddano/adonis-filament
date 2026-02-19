import { getCurrentTenantId } from '#middleware/tenant_resolver_middleware'

/**
 * Helper to apply tenant scope to a query builder
 */
export function applyTenantScope(query: any): void {
  const tenantId = getCurrentTenantId()
  if (tenantId) {
    query.where('tenant_id', tenantId)
  }
}

/**
 * Interface for tenant-aware models
 */
export interface HasTenant {
  tenantId: number | null
}

/**
 * Hook to use in models to auto-assign tenant_id
 *
 * Usage in a model:
 * ```typescript
 * import { assignTenantOnCreate } from '#app/traits/belongs_to_tenant'
 *
 * export default class Post extends BaseModel {
 *   @beforeCreate()
 *   static assignTenant = assignTenantOnCreate
 * }
 * ```
 */
export function assignTenantOnCreate(instance: any) {
  const tenantId = getCurrentTenantId()
  if (tenantId && !instance.tenantId) {
    instance.tenantId = tenantId
  }
}

/**
 * Create a tenant-filtered query scope
 *
 * Usage:
 * ```typescript
 * import { tenantScopedQuery } from '#app/traits/belongs_to_tenant'
 *
 * // Dans un service ou controller
 * const posts = await tenantScopedQuery(Post).orderBy('created_at', 'desc')
 * ```
 */
export function tenantScopedQuery<T extends { query: () => any }>(model: T) {
  const query = model.query()
  applyTenantScope(query)
  return query
}
