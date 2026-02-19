import { Resource } from '#filament/Core/Resource'
import User from '#models/user'
import { Form } from '#filament/Forms/Form'
import { TextInput, EmailInput, PasswordInput, Toggle } from '#filament/Forms/Components/index'
import { Table } from '#filament/Tables/Table'
import { TextColumn, BooleanColumn, DateColumn } from '#filament/Tables/Columns/index'
import { BooleanFilter } from '#filament/Tables/Filter'
import {
  EditAction,
  DeleteAction,
  CloneAction,
  BulkDeleteAction,
  ExportAction,
  ImportAction,
} from '#filament/Tables/Action'

export default class UserResource extends Resource {
  public static model = User
  public static slug = 'users'
  public static navigationIcon = 'heroicon-o-users'
  public static navigationLabel = 'Users'
  public static singularLabel = 'User'
  public static globalSearchTitle = 'fullName'
  public static softDeletes = true

  /**
   * Table definition for listing users
   */
  public static table(table: Table): Table {
    return table
      .columns([
        TextColumn.make('id').label('#').sortable().width('60px'),

        TextColumn.make('fullName').label('Full name').sortable().searchable(),

        TextColumn.make('email').label('Email').sortable().searchable().copyable(),

        BooleanColumn.make('isAdmin').label('Admin').sortable(),

        DateColumn.make('createdAt').label('Created at').sortable().since(),
      ])
      .filters([BooleanFilter.make('isAdmin').label('Administrator').labels('Admin', 'User')])
      .actions([EditAction.make(), CloneAction.make(), DeleteAction.make()])
      .bulkActions([BulkDeleteAction.make(), ExportAction.make().formats(['csv', 'xlsx'])])
      .headerActions([ImportAction.make().acceptedExtensions(['csv']).maxRows(2000)])
      .defaultSort('createdAt', 'desc')
      .searchable(true, 'Search a user...')
      .paginated(true, 10)
      .selectable()
  }

  /**
   * Form definition for creating/editing users
   */
  public static form(form: Form): Form {
    return form
      .columns(2)
      .schema([
        TextInput.make('fullName')
          .label('Full name')
          .required()
          .maxLength(255)
          .placeholder('John Doe')
          .columnSpan(2),

        EmailInput.make('email')
          .label('Email address')
          .required()
          .unique()
          .placeholder('john@example.com'),

        PasswordInput.make('password')
          .label('Password')
          .minLength(8)
          .revealable()
          .helperText('Minimum 8 characters. Leave blank to keep unchanged.')
          .placeholder('••••••••'),

        Toggle.make('isAdmin')
          .label('Administrator')
          .helperText('Grant administrator permissions to this user')
          .default(false)
          .columnSpan(2),
      ])
  }
}
