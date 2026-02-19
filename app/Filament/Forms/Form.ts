import vine from '@vinejs/vine'
import { Field } from './Field.js'

/**
 * Form - Main class to define a form
 *
 * Utilisation:
 * Form.make().schema([
 *   TextInput.make('name').required(),
 *   EmailInput.make('email'),
 * ])
 */
export class Form {
  protected _fields: Field[] = []
  protected _columns: number = 1

  /**
   * Factory method
   */
  static make(): Form {
    return new Form()
  }

  /**
   * Define form schema
   */
  schema(fields: Field[]): this {
    this._fields = fields
    return this
  }

  /**
   * Define number of columns
   */
  columns(columns: number): this {
    this._columns = columns
    return this
  }

  /**
   * Get form fields
   */
  getFields(): Field[] {
    return this._fields
  }

  /**
   * Get number of columns
   */
  getColumns(): number {
    return this._columns
  }

  /**
   * Get JSON schema for frontend
   */
  async getSchema(): Promise<Record<string, any>[]> {
    return Promise.all(this._fields.map((field) => field.toJson()))
  }

  /**
   * Generate dynamic VineJS schema for validation
   */
  public getValidationSchema(options?: { recordId?: number | string; model?: any }) {
    const schemaObj: Record<string, any> = {}

    for (const field of this._fields) {
      schemaObj[field.getName()] = field.toVine(options)
    }

    return vine.compile(vine.object(schemaObj))
  }

  /**
   * Get VineJS validation rules
   * @deprecated Use getValidationSchema instead
   */
  getValidationRules(): Record<string, string[]> {
    const rules: Record<string, string[]> = {}
    for (const field of this._fields) {
      const fieldRules = field.getRules()
      if (fieldRules.length > 0) {
        rules[field.getName()] = fieldRules
      }
    }
    return rules
  }

  /**
   * Get default values
   */
  async getDefaults(): Promise<Record<string, any>> {
    const defaults: Record<string, any> = {}
    const fieldsJson = await this.getSchema() // On attend le schema

    for (const json of fieldsJson) {
      if (json.defaultValue !== null) {
        defaults[json.name] = json.defaultValue
      }
    }
    return defaults
  }

  /**
   * Convertit le Form en JSON
   */
  async toJson(): Promise<Record<string, any>> {
    return {
      columns: this._columns,
      fields: await this.getSchema(),
    }
  }
}
