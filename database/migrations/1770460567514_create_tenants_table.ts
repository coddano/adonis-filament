import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tenants'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Identité
      table.string('name').notNullable()
      table.string('slug').unique().notNullable()

      // Domaine personnalisé (optionnel)
      table.string('domain').unique().nullable()

      // Statut
      table.enum('status', ['active', 'inactive', 'suspended']).defaultTo('active')

      // Configuration et branding (JSON)
      table.json('settings').nullable()
      table.json('branding').nullable()

      // Plan/Abonnement
      table.string('plan').defaultTo('free')

      // Métadonnées
      table.timestamp('trial_ends_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
