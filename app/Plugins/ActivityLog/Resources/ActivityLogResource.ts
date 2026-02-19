import { Resource } from '#filament/Core/Resource'
import { Form } from '#filament/Forms/Form'
import { Table } from '#filament/Tables/Table'
import { TextInput } from '#filament/Forms/Components/TextInput'
import { TextColumn } from '#filament/Tables/Columns/TextColumn'
import ActivityLog from '#models/ActivityLog'

export default class ActivityLogResource extends Resource {
  public static model = ActivityLog
  public static slug = 'activity-logs'
  public static label = 'Activity Logs'
  public static navigationIcon = 'activity'

  public static form(form: Form): Form {
    return form.schema([TextInput.make('description').required()])
  }

  public static table(table: Table): Table {
    return table.columns([
      TextColumn.make('id'),
      TextColumn.make('description'),
      TextColumn.make('createdAt'),
    ])
  }
}
