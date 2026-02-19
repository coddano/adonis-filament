import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected usersTableName = 'users'
  protected postsTableName = 'posts'
  protected tagsTableName = 'tags'

  async up() {
    this.schema.alterTable(this.usersTableName, (table) => {
      table.timestamp('deleted_at').nullable()
    })

    this.schema.alterTable(this.postsTableName, (table) => {
      table.timestamp('deleted_at').nullable()
    })

    this.schema.alterTable(this.tagsTableName, (table) => {
      table.timestamp('deleted_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tagsTableName, (table) => {
      table.dropColumn('deleted_at')
    })

    this.schema.alterTable(this.postsTableName, (table) => {
      table.dropColumn('deleted_at')
    })

    this.schema.alterTable(this.usersTableName, (table) => {
      table.dropColumn('deleted_at')
    })
  }
}
