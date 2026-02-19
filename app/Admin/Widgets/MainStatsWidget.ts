import { StatsWidget } from '#filament/Widgets/StatsWidget'
import User from '#models/user'
import Post from '#models/post'

export default class MainStatsWidget extends StatsWidget {
  public async getData() {
    // Real stats from DB
    const usersCount = await User.query().count('* as total').first()
    const postsCount = await Post.query().count('* as total').first()
    const publishedPostsCount = await Post.query()
      .where('status', 'published')
      .count('* as total')
      .first()

    return [
      {
        label: 'Users',
        value: usersCount?.$extras.total ?? 0,
        description: 'Total signed up',
        descriptionIcon: 'users',
        color: 'primary',
      },
      {
        label: 'Posts',
        value: postsCount?.$extras.total ?? 0,
        description: 'All posts',
        descriptionIcon: 'file-text',
        color: 'success',
      },
      {
        label: 'Published',
        value: publishedPostsCount?.$extras.total ?? 0,
        description: 'Published posts',
        descriptionIcon: 'check-circle',
        color: 'warning',
      },
    ]
  }
}
