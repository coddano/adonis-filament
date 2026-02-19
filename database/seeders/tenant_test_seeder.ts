import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Tenant from '#models/tenant'
import User from '#models/user'

export default class extends BaseSeeder {
  async run() {
    // 1. Créer le Tenant A (Acme Corp)
    const tenantA = await Tenant.create({
      name: 'Acme Corp',
      slug: 'acme',
      domain: 'acme.localhost', // Pour tester en local
      status: 'active',
      plan: 'pro',
      settings: {},
      branding: {
        primaryColor: '#ef4444', // Rouge
        logo: {
          light: 'https://via.placeholder.com/150/ef4444/FFFFFF?text=Acme+Light',
          dark: 'https://via.placeholder.com/150/ef4444/FFFFFF?text=Acme+Dark',
        },
      },
    })

    // 2. Créer le Tenant B (Globex Inc)
    const tenantB = await Tenant.create({
      name: 'Globex Inc',
      slug: 'globex',
      domain: 'globex.localhost',
      status: 'active',
      plan: 'enterprise',
      settings: {},
      branding: {
        primaryColor: '#3b82f6', // Bleu
        logo: {
          light: 'https://via.placeholder.com/150/3b82f6/FFFFFF?text=Globex+Light',
          dark: 'https://via.placeholder.com/150/3b82f6/FFFFFF?text=Globex+Dark',
        },
      },
    })

    // 3. Créer un Admin pour Tenant A
    await User.create({
      fullName: 'Alice Acme',
      email: 'alice@acme.com',
      password: 'password',
      tenantId: tenantA.id,
      isAdmin: true, // Admin du tenant
    })

    // 4. Créer un Utilisateur pour Tenant A
    await User.create({
      fullName: 'Bob Acme',
      email: 'bob@acme.com',
      password: 'password',
      tenantId: tenantA.id,
      isAdmin: false,
    })

    // 5. Créer un Admin pour Tenant B
    await User.create({
      fullName: 'Charlie Globex',
      email: 'charlie@globex.com',
      password: 'password',
      tenantId: tenantB.id,
      isAdmin: true,
    })

    // 6. Créer un Super Admin (sans tenant)
    await User.create({
      fullName: 'Super Admin',
      email: 'admin@system.com',
      password: 'password',
      tenantId: null,
      isAdmin: true,
    })
  }
}
