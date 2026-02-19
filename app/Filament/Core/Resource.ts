import { BaseModel } from '@adonisjs/lucid/orm'
import { Form } from '../Forms/Form.js'
import { Table } from '../Tables/Table.js'
import { getCurrentTenantId } from '../Support/Tenancy.js'

export abstract class Resource {
  public static model: typeof BaseModel
  public static slug: string
  public static navigationIcon: string
  public static navigationLabel: string
  public static singularLabel: string

  /**
   * Multi-tenancy: if true, queries are automatically tenant-filtered
   */
  public static tenantScoped: boolean = false

  /**
   * Indicates whether resource is expected to handle soft-deleted records
   * (configuration placeholder for future implementations).
   */
  public static softDeletes: boolean = false

  /**
   * Enable detail page (show) for a record.
   */
  public static hasViewPage: boolean = false

  /**
   * Define form schema pour cette ressource
   * Override in child classes
   */
  public static form(_form: Form): Form {
    return _form
  }

  /**
   * Define table schema for this resource
   * Override in child classes
   */
  public static table(_table: Table): Table {
    return _table
  }

  public static getSlug(): string {
    return this.slug || this.model.name.toLowerCase() + 's'
  }

  public static getNavigationLabel(): string {
    return this.navigationLabel || this.model.name + 's'
  }

  public static getSingularLabel(): string {
    return this.singularLabel || this.model.name
  }

  public static getModel(): typeof BaseModel {
    return this.model
  }

  /**
   * Get configured form for this resource
   */
  public static getForm(): Form {
    return this.form(Form.make())
  }

  /**
   * Get configured table for this resource
   */
  public static getTable(): Table {
    return this.table(Table.make())
  }

  /**
   * Get form JSON schema
   */
  public static async getFormSchema(): Promise<Record<string, any>[]> {
    return this.getForm().getSchema()
  }

  /**
   * Get table JSON schema
   */
  public static getTableSchema(): Record<string, any> {
    return this.getTable().toJson()
  }

  /**
   * Get default values du formulaire
   */
  public static getFormDefaults(): Record<string, any> {
    return this.getForm().getDefaults()
  }

  // --- Global Search Support ---

  public static globalSearchTitle: string = 'id'

  /**
   * Perform global search on this resource
   */
  public static async getGlobalSearchResults(query: string): Promise<any[]> {
    const searchColumn = this.globalSearchTitle

    let searchQuery = this.scopedQuery().where(searchColumn, 'LIKE', `%${query}%`)

    if (this.softDeletes && this.model?.$hasColumn?.('deletedAt')) {
      const deletedAtColumn = this.model.$getColumn('deletedAt')?.columnName || 'deleted_at'
      searchQuery = searchQuery.whereNull(deletedAtColumn)
    }

    const results = await searchQuery.limit(5)

    return results.map((record: any) => ({
      title: record[searchColumn],
      url: `/admin/${this.getSlug()}/${record.id}/edit`,
      description: this.getSingularLabel(),
    }))
  }

  // --- Multi-tenancy Support ---

  /**
   * Return query with tenant scope applied when needed
   */
  public static scopedQuery() {
    const query = this.model.query()

    if (this.tenantScoped) {
      const tenantId = getCurrentTenantId()
      if (tenantId) {
        query.where('tenant_id', tenantId)
      }
    }

    return query
  }

  // --- RBAC / Permissions ---

  /**
   * Return slug used for permissions (e.g. 'users', 'posts')
   */
  public static getPermissionSlug(): string {
    return this.getSlug()
  }

  /**
   * Check whether user can list this resource
   */
  public static async canViewAny(user: any): Promise<boolean> {
    if (!user) return false
    if (user.isAdmin) return true
    return user.hasPermission ? await user.hasPermission(`${this.getPermissionSlug()}.view`) : true
  }

  /**
   * Check whether user can view a specific record
   */
  public static async canView(user: any, _record?: any): Promise<boolean> {
    if (!user) return false
    if (user.isAdmin) return true
    return user.hasPermission ? await user.hasPermission(`${this.getPermissionSlug()}.view`) : true
  }

  /**
   * Check whether user can create a record
   */
  public static async canCreate(user: any): Promise<boolean> {
    if (!user) return false
    if (user.isAdmin) return true
    return user.hasPermission
      ? await user.hasPermission(`${this.getPermissionSlug()}.create`)
      : true
  }

  /**
   * Check whether user can update a record
   */
  public static async canUpdate(user: any, _record?: any): Promise<boolean> {
    if (!user) return false
    if (user.isAdmin) return true
    return user.hasPermission
      ? await user.hasPermission(`${this.getPermissionSlug()}.update`)
      : true
  }

  /**
   * Check whether user can delete a record
   */
  public static async canDelete(user: any, _record?: any): Promise<boolean> {
    if (!user) return false
    if (user.isAdmin) return true
    return user.hasPermission
      ? await user.hasPermission(`${this.getPermissionSlug()}.delete`)
      : true
  }

  /**
   * Return user permissions for this resource
   */
  public static async getPermissions(user: any): Promise<Record<string, boolean>> {
    return {
      canViewAny: await this.canViewAny(user),
      canCreate: await this.canCreate(user),
      canUpdate: await this.canUpdate(user),
      canDelete: await this.canDelete(user),
    }
  }
}
