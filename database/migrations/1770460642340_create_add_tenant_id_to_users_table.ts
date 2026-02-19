import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Tenant foreign key (nullable pour supporter single-tenant legacy)
      table
        .integer('tenant_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')

      // Index pour les requêtes filtrées par tenant
      table.index(['tenant_id'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['tenant_id'])
      table.dropColumn('tenant_id')
    })
  }
}
