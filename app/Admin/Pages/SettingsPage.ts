import { Form } from '#filament/Forms/Form'
import { TextInput, Textarea, EmailInput } from '#filament/Forms/Components/index'
import Setting from '#models/setting'

export class Page {
  static icon: string = 'cog'
  static label: string = 'Page'
  static slug: string = 'page'
  protected form!: Form

  /**
   * Configuration du formulaire
   */
  public buildForm(): Form {
    return Form.make()
  }

  /**
   * Get form
   */
  public getForm(): Form {
    if (!this.form) {
      this.form = this.buildForm()
    }
    return this.form
  }

  /**
   * Get existing data
   */
  public async getData(): Promise<any> {
    return {}
  }

  /**
   * Save data
   */
  public async save(_data: any): Promise<void> {
    // ... default implementation
  }
}

export default class SettingsPage extends Page {
  static icon = 'cog'
  static label = 'General Settings'
  static slug = 'settings'

  public buildForm(): Form {
    return Form.make()
      .schema([
        TextInput.make('site_name').label('Site name').required().placeholder('My Awesome Site'),

        EmailInput.make('admin_email').label('Admin email').required(),

        Textarea.make('site_description').label('Description').rows(3),

        TextInput.make('twitter_url')
          .label('Twitter URL')
          .placeholder('https://twitter.com/your-account'),

        TextInput.make('facebook_url')
          .label('Facebook URL')
          .placeholder('https://facebook.com/your-page'),
      ])
      .columns(2)
  }

  /**
   * Charge les settings depuis la DB
   */
  public async getData(): Promise<any> {
    const settings = await Setting.query().where('group', 'general')

    // Default values
    const defaults: Record<string, any> = {
      site_name: 'Adonis Admin',
      admin_email: 'admin@example.com',
    }

    // Surcharger avec les valeurs DB
    settings.forEach((s) => {
      defaults[s.key] = s.value
    })

    return defaults
  }

  /**
   * Sauvegarde les settings en DB
   */
  public async save(data: any): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        await Setting.updateOrCreate(
          { key },
          {
            key,
            value: String(value), // Pour l'instant on stocke tout en string
            group: 'general',
            type: 'string',
          }
        )
      }
    }
  }
}
