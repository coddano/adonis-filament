import { Resource } from '#filament/Core/Resource'
import Tag from '#models/tag'
import { Form } from '#filament/Forms/Form'
import { Table } from '#filament/Tables/Table'
import { TextInput, Textarea, Toggle } from '#filament/Forms/Components/index'
import { TextColumn, BooleanColumn, DateColumn } from '#filament/Tables/Columns/index'
import { EditAction, DeleteAction, BulkDeleteAction } from '#filament/Tables/Action'

export default class TagResource extends Resource {
  public static model = Tag
  public static slug = 'tags'
  public static navigationIcon = 'file'
  public static navigationLabel = 'Tags'
  public static singularLabel = 'Tag'
  public static softDeletes = true

  public static form(form: Form): Form {
    return form.schema([
      TextInput.make('name'),
      TextInput.make('slug'),
      Textarea.make('description'),
      Toggle.make('isActive'),
    ])
  }

  public static table(table: Table): Table {
    return table
      .columns([
        TextColumn.make('id').sortable(),
        TextColumn.make('name').searchable(),
        TextColumn.make('slug').searchable(),
        TextColumn.make('description').searchable(),
        BooleanColumn.make('isActive').sortable(),
        DateColumn.make('createdAt').dateTime().sortable(),
        DateColumn.make('updatedAt').dateTime().sortable(),
      ])
      .actions([EditAction.make(), DeleteAction.make()])
      .bulkActions([BulkDeleteAction.make()])
      .defaultSort('createdAt', 'desc')
  }
}
