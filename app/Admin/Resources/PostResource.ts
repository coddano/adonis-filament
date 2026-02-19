import { Resource } from '#filament/Core/Resource'
import { Form } from '#filament/Forms/Form'
import { Table } from '#filament/Tables/Table'
import { TextInput } from '#filament/Forms/Components/TextInput'
import { Textarea } from '#filament/Forms/Components/Textarea'
import { Select } from '#filament/Forms/Components/Select'
import { Toggle } from '#filament/Forms/Components/Toggle'
import { DatePicker } from '#filament/Forms/Components/DatePicker'
import { FileUpload } from '#filament/Forms/Components/FileUpload'
import { TextColumn } from '#filament/Tables/Columns/index'
import { BadgeColumn } from '#filament/Tables/Columns/BadgeColumn'
import { EditAction, DeleteAction } from '#filament/Tables/Action'
import Post from '#models/post'
import User from '#models/user'
import Tag from '#models/tag'

export default class PostResource extends Resource {
  static model = Post
  static label = 'Posts'
  static singularLabel = 'Post'
  static icon = 'file-text'
  static globalSearchTitle = 'title'
  static softDeletes = true

  static form(form: Form): Form {
    return form
      .schema([
        FileUpload.make('coverImage').label('Cover image').image().maxSize('5mb').columnSpan(2),

        TextInput.make('title').label('Title').required().placeholder('Enter the post title'),

        TextInput.make('slug').label('Slug').required().slugFrom('title').unique('posts'),

        Select.make('userId')
          .label('Author')
          .options(async () => {
            const users = await User.query().orderBy('email', 'asc')
            return users.map((u) => ({
              value: u.id,
              label: u.fullName ? `${u.fullName} (${u.email})` : u.email,
            }))
          })
          .searchable()
          .required(),

        Select.make('status')
          .label('Status')
          .options([
            { value: 'draft', label: 'Draft' },
            { value: 'published', label: 'Published' },
            { value: 'archived', label: 'Archived' },
          ])
          .default('draft')
          .required(),

        Toggle.make('isFeatured').label('Featured'),

        DatePicker.make('publishedAt').label('Publish date').placeholder('Select a date'),

        Textarea.make('content').label('Content').rows(10).columnSpan(2),

        Select.make('tags')
          .label('Tags')
          .options(async () => {
            const tags = await Tag.query().orderBy('name', 'asc')
            return tags.map((t) => ({
              value: t.id,
              label: t.name,
            }))
          })
          .multiple()
          .searchable()
          .columnSpan(2),
      ])
      .columns(2)
  }

  static table(table: Table): Table {
    return table
      .columns([
        TextColumn.make('title').label('Title').sortable().searchable(),

        BadgeColumn.make('status')
          .label('Status')
          .options({
            draft: { label: 'Draft', color: 'gray' },
            published: { label: 'Published', color: 'success' },
            archived: { label: 'Archived', color: 'warning' },
          })
          .sortable(),

        TextColumn.make('user.email').label('Author').sortable(),

        TextColumn.make('createdAt').label('Created at').sortable(),
      ])
      .actions([EditAction.make(), DeleteAction.make()])
  }
}
