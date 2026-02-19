import { Resource } from '#filament/Core/Resource'
import { TextInput, Textarea } from '#filament/Forms/Components/index'
import { TextColumn } from '#filament/Tables/Columns/index'
import Role from '#models/role'

export default class RoleResource extends Resource {
  public static model = Role
  public static icon = 'shield'
  public static label = 'Roles'
  public static slug = 'roles'
  public static globalSearchTitle = 'name'

  public static form(form: any) {
    return form.schema([
      TextInput.make('name').label('Name').required().placeholder('Administrator'),

      TextInput.make('slug').label('Slug').required().placeholder('admin'),

      Textarea.make('description').label('Description').rows(3),
    ])
  }

  public static table(table: any) {
    return table.columns([
      TextColumn.make('name').label('Name').sortable().searchable(),
      TextColumn.make('slug').label('Slug').sortable().searchable(),
      TextColumn.make('description').label('Description').limit(50),
      TextColumn.make('createdAt').label('Created at').dateTime(),
    ])
  }

  public static async getGlobalSearchResults(query: string) {
    const results = (await this.getModel()
      .query()
      .where('name', 'ilike', `%${query}%`)
      .limit(5)) as Role[]

    return results.map((record: Role) => ({
      title: record.name,
      url: `/admin/${this.getSlug()}/${record.id}/edit`,
      description: 'Role',
    }))
  }
}
