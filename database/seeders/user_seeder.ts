import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

export default class extends BaseSeeder {
  async run() {
    await User.create({
      fullName: 'Admin User',
      email: 'admin@filament.com',
      password: 'password',
      isAdmin: true,
      role: 'admin',
    })
  }
}
