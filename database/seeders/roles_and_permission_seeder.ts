import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Role from '#models/role'
import Permission from '#models/permission'
import User from '#models/user'

export default class extends BaseSeeder {
  async run() {
    // 1. Définir les ressources et actions
    const resources = ['users', 'posts', 'roles', 'settings']
    const actions = ['view', 'create', 'update', 'delete']

    // 2. Créer les permissions
    const permissions: Permission[] = []

    for (const resource of resources) {
      for (const action of actions) {
        const slug = `${resource}.${action}`
        const name = `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`

        const permission = await Permission.updateOrCreate(
          { slug },
          {
            slug,
            name,
            resource,
            action,
          }
        )
        permissions.push(permission)
      }
    }

    // 3. Créer le rôle Admin (accès total)
    const adminRole = await Role.updateOrCreate(
      { slug: 'admin' },
      {
        name: 'Administrateur',
        slug: 'admin',
        description: 'Accès complet au système',
      }
    )

    // Assigner toutes les permissions
    await adminRole.related('permissions').sync(permissions.map((p) => p.id))

    // 4. Créer le rôle Éditeur (accès aux posts seulement)
    const editorRole = await Role.updateOrCreate(
      { slug: 'editor' },
      {
        name: 'Éditeur',
        slug: 'editor',
        description: 'Peut gérer les articles',
      }
    )

    const postPermissions = permissions.filter((p) => p.resource === 'posts').map((p) => p.id)
    await editorRole.related('permissions').sync(postPermissions)

    // 5. Assigner le rôle Admin au premier utilisateur
    const firstUser = await User.first()
    if (firstUser) {
      await firstUser.related('roles').sync([adminRole.id])
    }

    console.log('✅ Roles and Permissions seeded successfully!')
  }
}
