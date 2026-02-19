import { Panel } from '#filament/Core/Panel'
import { Dashboard } from '#filament/Core/Dashboard'
import { StatsWidget, ChartWidget, TableWidget } from '#filament/Widgets/index'
import UserResource from '#admin/Resources/UserResource'
import PostResource from '#admin/Resources/PostResource'
import RoleResource from '#admin/Resources/RoleResource'
import TenantResource from '#admin/Resources/TenantResource'
import TagResource from '#admin/Resources/TagResource'
import ProductResource from '#admin/Resources/ProductResource'
import SettingsPage from '#admin/Pages/SettingsPage'
import User from '#models/user'
import Post from '#models/post'

import ActivityLogPlugin from '../../Plugins/ActivityLog/ActivityLogPlugin.js'

export default class AdminPanel extends Panel {
  public id = 'admin'
  public path = '/admin'
  public label = 'Admin'
  public resources = [
    UserResource,
    PostResource,
    TagResource,
    ProductResource,
    RoleResource,
    TenantResource,
  ]
  public pages = [SettingsPage]

  constructor() {
    super()

    // Enregistrer le plugin d'exemple
    this.plugin(new ActivityLogPlugin())

    // Theme configuration
    this.brandName('Adonis Admin')
      .colors({
        primary: '262 83% 58%', // Violet AdonisJS
        secondary: '217 91% 60%', // Bleu
        accent: '262 83% 58%', // Violet
        success: '142 76% 36%', // Vert
        warning: '38 92% 50%', // Orange
        danger: '0 84% 60%', // Rouge
      })
      .sidebar({
        width: '280px',
        collapsedWidth: '80px',
        collapsible: true,
      })
      .darkMode('class')
  }

  /**
   * Configuration du dashboard avec widgets
   */
  public configureDashboard(): Dashboard {
    return Dashboard.make()
      .title('Dashboard')
      .description('Overview of your application')
      .columns(4)
      .widgets([
        // Widget Stats
        StatsWidget.make('overview')
          .columnSpan('full')
          .columns(4)
          .stat({
            label: 'Users',
            value: async () => {
              const count = await User.query().count('*', 'total')
              return count[0].$extras.total || 0
            },
            icon: 'users',
            color: 'primary',
            trend: { value: 5, direction: 'up', label: 'this week' },
          })
          .stat({
            label: 'Posts',
            value: async () => {
              const count = await Post.query().count('*', 'total')
              return count[0].$extras.total || 0
            },
            icon: 'file-text',
            color: 'info',
            trend: { value: 12, direction: 'up', label: 'new' },
          })
          .stat({
            label: 'Published posts',
            value: async () => {
              const count = await Post.query().where('status', 'published').count('*', 'total')
              return count[0].$extras.total || 0
            },
            icon: 'check-circle',
            color: 'success',
          })
          .stat({
            label: 'Drafts',
            value: async () => {
              const count = await Post.query().where('status', 'draft').count('*', 'total')
              return count[0].$extras.total || 0
            },
            icon: 'edit-2',
            color: 'warning',
          })
          .sort(1),

        // Chart - Inscriptions par mois
        ChartWidget.make('registrations-chart')
          .heading('Signups')
          .description('Signup trend over 6 months')
          .type('area')
          .labels(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'])
          .dataset('Users', [12, 19, 15, 25, 22, 30])
          .columnSpan(2)
          .height(280)
          .sort(2),

        // Chart - Articles par statut
        ChartWidget.make('posts-status-chart')
          .heading('Posts by status')
          .description('Post status distribution')
          .type('doughnut')
          .labels(['Published', 'Draft', 'Archived'])
          .dataset('Posts', async () => {
            const published = await Post.query()
              .where('status', 'published')
              .count('* as total')
              .first()
            const draft = await Post.query().where('status', 'draft').count('* as total').first()
            const archived = await Post.query()
              .where('status', 'archived')
              .count('* as total')
              .first()
            return [
              published?.$extras.total || 0,
              draft?.$extras.total || 0,
              archived?.$extras.total || 0,
            ]
          })
          .columnSpan(2)
          .height(280)
          .legend(true)
          .sort(3),

        // Table - Derniers utilisateurs
        TableWidget.make('recent-users')
          .heading('Latest users')
          .column('fullName', 'Name')
          .column('email', 'Email')
          .column('createdAt', 'Joined at', { format: 'date' })
          .rows(async () => {
            const users = await User.query().orderBy('created_at', 'desc').limit(5)
            return users.map((u) => u.serialize())
          })
          .limit(5)
          .striped()
          .viewAllUrl('/admin/users')
          .columnSpan(2)
          .sort(4),

        // Table - Derniers articles
        TableWidget.make('recent-posts')
          .heading('Latest posts')
          .column('title', 'Title')
          .column('status', 'Status')
          .column('createdAt', 'Created at', { format: 'date' })
          .rows(async () => {
            const posts = await Post.query().orderBy('created_at', 'desc').limit(5)
            return posts.map((p) => ({
              id: p.id,
              title: p.title,
              status: p.status, // On pourrait mapper les labels ici si besoin
              createdAt: p.createdAt,
            }))
          })
          .limit(5)
          .hoverable()
          .viewAllUrl('/admin/posts')
          .columnSpan(2)
          .sort(5),
      ])
  }
}
