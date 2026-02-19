import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import string from '@adonisjs/core/helpers/string'
import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

type ModelColumnType = 'text' | 'number' | 'boolean' | 'dateTime' | 'date' | 'json'

interface ModelColumn {
  name: string
  type: ModelColumnType
}

interface GeneratedSchema {
  schema: string
  imports: Set<string>
  modelImports: Set<string>
}

export default class MakeFilamentResource extends BaseCommand {
  static commandName = 'make:filament-resource'
  static description = 'Create a new Filament resource'
  static aliases = ['make:resource']

  @args.string({ description: 'Name of the resource' })
  declare name: string

  @flags.boolean({ description: 'Generate form and table from model', alias: 'g' })
  declare generate: boolean

  @flags.boolean({ description: 'Enable soft deletes' })
  declare softDeletes: boolean

  @flags.boolean({ description: 'Create a simple resource (no view, edit actions)' })
  declare simple: boolean

  @flags.boolean({ description: 'Enable tenant scoping', alias: 't' })
  declare tenant: boolean

  @flags.boolean({ description: 'Generate a dedicated show/view page and action' })
  declare view: boolean

  private relationLabelCache = new Map<
    string,
    { labelField: string; orderBy: string; orderDirection: 'asc' | 'desc' }
  >()

  private resolveStub(stubRelativePath: string) {
    const appStubsRoot = this.app.makePath('stubs')
    if (existsSync(`${appStubsRoot}/${stubRelativePath}`)) {
      return {
        root: appStubsRoot,
        path: stubRelativePath,
      }
    }

    const candidatePackageRoots = [
      fileURLToPath(new URL('../', import.meta.url)),
      fileURLToPath(new URL('../../', import.meta.url)),
    ]

    for (const root of candidatePackageRoots) {
      const packageStubPath = `${root}/stubs/${stubRelativePath}`
      if (existsSync(packageStubPath)) {
        return {
          root,
          path: `stubs/${stubRelativePath}`,
        }
      }
    }

    return {
      root: appStubsRoot,
      path: stubRelativePath,
    }
  }

  async run() {
    const cleanName = this.name.replace(/Resource$/i, '')
    const modelName = string.pascalCase(cleanName)
    const viewPage = this.view && !this.simple

    let formSchema = ''
    let tableColumns = ''
    let defaultSortColumn = 'id'
    const formImports = new Set<string>()
    const tableImports = new Set<string>()
    const relationModelImports = new Set<string>()
    const actionImports = new Set<string>()

    if (this.view && this.simple) {
      this.logger.warning('--view is ignored when --simple is enabled')
    }

    if (!this.simple) {
      actionImports.add('EditAction')
      actionImports.add('DeleteAction')
      actionImports.add('BulkDeleteAction')
    }

    if (viewPage) {
      actionImports.add('ViewAction')
    }

    if (this.generate) {
      this.logger.info(`Analyzing model ${modelName}...`)

      try {
        const columns = await this.getModelColumns(modelName)
        const availableModels = await this.getAvailableModels()

        if (columns.length > 0) {
          const generatedForm = await this.generateFormSchema(columns, modelName, availableModels)
          const generatedTable = this.generateTableColumns(columns)

          formSchema = generatedForm.schema
          tableColumns = generatedTable.schema
          defaultSortColumn = this.getDefaultSortColumn(columns)
          generatedForm.imports.forEach((item) => formImports.add(item))
          generatedForm.modelImports.forEach((item) => relationModelImports.add(item))
          generatedTable.imports.forEach((item) => tableImports.add(item))

          this.logger.success(`Found ${columns.length} columns in model`)
        } else {
          this.logger.warning(
            `No @column decorators found in app/models/${string.snakeCase(modelName)}.ts`
          )
        }
      } catch {
        this.logger.warning(
          `Could not load model file: app/models/${string.snakeCase(modelName)}.ts`
        )
      }
    }

    const codemods = await this.createCodemods()

    const relationImportLines = Array.from(relationModelImports).sort()

    const resourceStub = this.resolveStub('filament/resource.stub')

    await codemods.makeUsingStub(resourceStub.root, resourceStub.path, {
      name: cleanName,
      resourceSlug: string.dashCase(string.pluralize(modelName)),
      icon: this.getDefaultIcon(modelName),
      navigationLabel: string.pluralize(modelName),
      singularLabel: modelName,
      formSchema: formSchema || '// Ajouter les champs ici',
      tableColumns: tableColumns || '// Ajouter les colonnes ici',
      formImports: Array.from(formImports).sort().join(', '),
      tableImports: Array.from(tableImports).sort().join(', '),
      relationModelImports:
        relationImportLines.length > 0 ? `\n${relationImportLines.join('\n')}\n` : '',
      hasFormImports: formImports.size > 0,
      hasTableImports: tableImports.size > 0,
      hasRelationModelImports: relationModelImports.size > 0,
      actionImports: Array.from(actionImports).sort().join(', '),
      hasActionImports: actionImports.size > 0,
      defaultSortColumn,
      simple: this.simple,
      viewPage,
      softDeletes: this.softDeletes,
      tenantScoped: this.tenant,
    })

    this.logger.success(`Resource created successfully!`)
    this.logger.info('Next steps:')
    this.logger.info(`  1. Register the resource in your AdminPanel`)
    this.logger.info(`  2. Visit /admin/${string.dashCase(string.pluralize(modelName))}`)
  }

  private async getModelColumns(modelName: string): Promise<ModelColumn[]> {
    const fileName = string.snakeCase(modelName) + '.ts'
    const filePath = this.app.makePath('app/models', fileName)
    const content = await readFile(filePath, 'utf-8')

    const regex =
      /@column(?:\.(dateTime|date|boolean|json))?(?:\([^)]*\))?\s+(?:declare|public|protected|private)\s+(\w+)\s*:\s*([^=\n;]+)/g
    const columns: ModelColumn[] = []

    let match
    while ((match = regex.exec(content)) !== null) {
      const decoratorType = match[1] as ModelColumnType | undefined
      const propertyName = match[2]
      const tsType = match[3] || ''
      columns.push({
        name: propertyName,
        type: decoratorType || this.inferColumnTypeFromTs(tsType),
      })
    }

    return columns
  }

  private async getAvailableModels(): Promise<Set<string>> {
    const files = await readdir(this.app.makePath('app/models'))
    return new Set(
      files
        .filter((file) => file.endsWith('.ts'))
        .map((file) => string.pascalCase(file.replace(/\.ts$/, '')))
    )
  }

  private inferColumnTypeFromTs(tsType: string): ModelColumnType {
    const normalized = tsType.replace(/\s+/g, '').toLowerCase()

    if (normalized.includes('boolean')) return 'boolean'
    if (normalized.includes('number')) return 'number'
    if (normalized.includes('datetime') || normalized.includes('date')) return 'dateTime'
    if (normalized.includes('{') || normalized.includes('[') || normalized.includes('record<'))
      return 'json'

    return 'text'
  }

  private async generateFormSchema(
    columns: ModelColumn[],
    modelName: string,
    availableModels: Set<string>
  ): Promise<GeneratedSchema> {
    const fields: string[] = []
    const imports = new Set<string>()
    const modelImports = new Set<string>()

    for (const col of columns) {
      if (['id', 'createdAt', 'updatedAt', 'tenantId', 'deletedAt'].includes(col.name)) continue

      let field = ''

      if (col.name.includes('email')) {
        imports.add('EmailInput')
        field = `EmailInput.make('${col.name}').required()`
      } else if (col.name.includes('password')) {
        imports.add('PasswordInput')
        field = `PasswordInput.make('${col.name}').revealable().required()`
      } else if (['content', 'description', 'bio'].some((k) => col.name.includes(k))) {
        imports.add('Textarea')
        field = `Textarea.make('${col.name}')`
      } else if (
        col.type === 'boolean' ||
        col.name.startsWith('is') ||
        col.name.startsWith('has')
      ) {
        imports.add('Toggle')
        field = `Toggle.make('${col.name}')`
      } else if (col.name.endsWith('Id') && col.name.length > 2) {
        imports.add('Select')
        const relationModelName = string.pascalCase(col.name.replace(/Id$/, ''))

        if (availableModels.has(relationModelName)) {
          if (relationModelName !== modelName) {
            modelImports.add(
              `import ${relationModelName} from '#models/${string.snakeCase(relationModelName)}'`
            )
          }

          const relationLabelMeta = await this.getRelationLabelMeta(relationModelName)
          field = `Select.make('${col.name}')
        .options(async () => {
          const records = await ${relationModelName}.query().orderBy('${relationLabelMeta.orderBy}', '${relationLabelMeta.orderDirection}').limit(200)
          return records.map((record: any) => ({
            value: record.id,
            label: record.${relationLabelMeta.labelField} ?? String(record.id),
          }))
        })
        .searchable()`
        } else {
          field = `Select.make('${col.name}').options([]).searchable()`
        }
      } else if (col.type === 'dateTime' || col.type === 'date') {
        imports.add('DatePicker')
        field = `DatePicker.make('${col.name}')`
      } else {
        imports.add('TextInput')
        field = `TextInput.make('${col.name}')`
      }

      fields.push(field)
    }

    return {
      schema: fields.join(',\n      '),
      imports,
      modelImports,
    }
  }

  private generateTableColumns(columns: ModelColumn[]): GeneratedSchema {
    const fields: string[] = []
    const imports = new Set<string>()

    for (const col of columns) {
      if (['password', 'tenantId', 'rememberToken'].includes(col.name)) continue

      let field = ''

      if (col.name === 'id') {
        imports.add('TextColumn')
        field = `TextColumn.make('${col.name}').sortable()`
      } else if (col.name === 'createdAt' || col.type === 'dateTime' || col.type === 'date') {
        imports.add('DateColumn')
        field = `DateColumn.make('${col.name}').dateTime().sortable()`
      } else if (
        col.type === 'boolean' ||
        col.name.startsWith('is') ||
        col.name.startsWith('has')
      ) {
        imports.add('BooleanColumn')
        field = `BooleanColumn.make('${col.name}').sortable()`
      } else {
        imports.add('TextColumn')
        field = `TextColumn.make('${col.name}').searchable()`
      }

      fields.push(field)
    }

    return {
      schema: fields.join(',\n        '),
      imports,
      modelImports: new Set<string>(),
    }
  }

  private async getRelationLabelMeta(
    relationModelName: string
  ): Promise<{ labelField: string; orderBy: string; orderDirection: 'asc' | 'desc' }> {
    const cached = this.relationLabelCache.get(relationModelName)
    if (cached) return cached

    let relationColumns: ModelColumn[] = []
    try {
      relationColumns = await this.getModelColumns(relationModelName)
    } catch {
      // Silencieux: fallback sur id
    }

    const labelField = this.pickBestRelationLabelField(relationColumns)
    const labelColumn = relationColumns.find((col) => col.name === labelField)

    const orderDirection: 'asc' | 'desc' =
      labelField === 'id' || labelColumn?.type === 'number' || labelColumn?.type === 'dateTime'
        ? 'desc'
        : 'asc'

    const meta = {
      labelField,
      orderBy: labelField,
      orderDirection,
    }

    this.relationLabelCache.set(relationModelName, meta)
    return meta
  }

  private pickBestRelationLabelField(columns: ModelColumn[]): string {
    if (columns.length === 0) return 'id'

    const priorityCandidates = [
      'displayName',
      'fullName',
      'name',
      'title',
      'label',
      'email',
      'username',
      'slug',
      'code',
      'reference',
      'firstName',
    ]

    for (const candidate of priorityCandidates) {
      if (columns.some((col) => col.name === candidate)) {
        return candidate
      }
    }

    const excluded = new Set([
      'id',
      'password',
      'rememberToken',
      'tenantId',
      'deletedAt',
      'createdAt',
      'updatedAt',
    ])

    const firstTextColumn = columns.find(
      (col) => col.type === 'text' && !excluded.has(col.name) && !col.name.endsWith('Id')
    )
    if (firstTextColumn) return firstTextColumn.name

    const firstNonSystemColumn = columns.find((col) => !excluded.has(col.name))
    if (firstNonSystemColumn) return firstNonSystemColumn.name

    return 'id'
  }

  private getDefaultSortColumn(columns: ModelColumn[]): string {
    if (columns.some((column) => column.name === 'createdAt')) return 'createdAt'
    if (columns.some((column) => column.name === 'id')) return 'id'

    const firstSortable = columns.find(
      (column) => !['password', 'tenantId', 'rememberToken', 'deletedAt'].includes(column.name)
    )

    return firstSortable?.name || 'id'
  }

  private getDefaultIcon(modelName: string): string {
    const iconMap: Record<string, string> = {
      User: 'users',
      Post: 'file-text',
      Product: 'shopping-bag',
      Order: 'shopping-cart',
      Category: 'tag',
      Tenant: 'building-2',
      Role: 'shield',
      Permission: 'key',
      Setting: 'settings',
    }

    return iconMap[modelName] || 'file'
  }
}
