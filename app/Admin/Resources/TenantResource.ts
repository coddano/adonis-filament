import { Resource } from '#filament/Core/Resource'
import { Form } from '#filament/Forms/Form'
import { Table } from '#filament/Tables/Table'
import { TextInput } from '#filament/Forms/Components/TextInput'
import { Select } from '#filament/Forms/Components/Select'
import { Textarea } from '#filament/Forms/Components/Textarea'
import { TextColumn } from '#filament/Tables/Columns/TextColumn'
import { BadgeColumn } from '#filament/Tables/Columns/BadgeColumn'
import Tenant from '#models/tenant'

export default class TenantResource extends Resource {
  public static model = Tenant
  public static slug = 'tenants'
  public static navigationIcon = 'building-2'
  public static navigationLabel = 'Tenants'
  public static singularLabel = 'Tenant'
  public static globalSearchTitle = 'name'

  // Tenant resource is not tenant-scoped (super admin only)
  public static tenantScoped = false

  public static form(form: Form): Form {
    return form.schema([
      TextInput.make('name').label('Name').required().placeholder('Acme Corp'),

      TextInput.make('slug')
        .label('Slug')
        .required()
        .unique()
        .placeholder('acme-corp')
        .helperText('Unique identifier used in the URL'),

      TextInput.make('domain')
        .label('Custom domain')
        .placeholder('admin.acme.com')
        .helperText('Optional - custom domain for this tenant'),

      Select.make('status')
        .label('Status')
        .options([
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' },
          { label: 'Suspended', value: 'suspended' },
        ])
        .default('active'),

      Select.make('plan')
        .label('Plan')
        .options([
          { label: 'Free', value: 'free' },
          { label: 'Starter', value: 'starter' },
          { label: 'Pro', value: 'pro' },
          { label: 'Enterprise', value: 'enterprise' },
        ])
        .default('free'),

      Textarea.make('settings')
        .label('Settings (JSON)')
        .rows(4)
        .helperText('Advanced configuration in JSON format'),

      Textarea.make('branding')
        .label('Branding (JSON)')
        .rows(4)
        .helperText('Logo and custom colors in JSON format'),
    ])
  }

  public static table(table: Table): Table {
    return table
      .columns([
        TextColumn.make('id').label('ID').sortable(),
        TextColumn.make('name').label('Name').searchable().sortable(),
        TextColumn.make('slug').label('Slug').searchable(),
        TextColumn.make('domain').label('Domain'),
        BadgeColumn.make('status')
          .label('Status')
          .options({
            active: { label: 'Active', color: 'success' },
            inactive: { label: 'Inactive', color: 'warning' },
            suspended: { label: 'Suspended', color: 'danger' },
          }),
        BadgeColumn.make('plan')
          .label('Plan')
          .options({
            free: { label: 'Free', color: 'secondary' },
            starter: { label: 'Starter', color: 'info' },
            pro: { label: 'Pro', color: 'primary' },
            enterprise: { label: 'Enterprise', color: 'success' },
          }),
        TextColumn.make('createdAt').label('Created at').dateTime(),
      ])
      .searchable(true)
      .defaultSort('createdAt', 'desc')
  }

  /**
   * Only super admins can manage tenants
   */
  public static async canViewAny(user: any): Promise<boolean> {
    return user?.isAdmin === true
  }

  public static async canCreate(user: any): Promise<boolean> {
    return user?.isAdmin === true
  }

  public static async canUpdate(user: any, _record?: any): Promise<boolean> {
    return user?.isAdmin === true
  }

  public static async canDelete(user: any, _record?: any): Promise<boolean> {
    return user?.isAdmin === true
  }
}
