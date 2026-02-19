import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Tag from '#models/tag'

export default class extends BaseSeeder {
  async run() {
    await Tag.createMany([
      { name: 'AdonisJS', slug: 'adonisjs' },
      { name: 'VueJS', slug: 'vuejs' },
      { name: 'TypeScript', slug: 'typescript' },
      { name: 'Filament', slug: 'filament' },
      { name: 'Architecture', slug: 'architecture' },
    ])
  }
}
