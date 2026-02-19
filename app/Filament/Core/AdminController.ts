import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { readFile } from 'node:fs/promises'
import hash from '@adonisjs/core/services/hash'
import {
  getCurrentTenantId,
  isTenantActive,
  resolveTenantById,
  serializeTenant,
} from '../Support/Tenancy.js'
import filament from './FilamentManager.js'
import {
  buildOtpAuthUri,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  normalizeRecoveryCode,
  verifyTotpToken,
} from '../Support/Totp.js'

export default class AdminController {
  private normalizeTrashedMode(value: unknown): 'without' | 'with' | 'only' {
    return value === 'with' || value === 'only' ? value : 'without'
  }

  private getDeletedAtColumnName(model: any): string | null {
    if (!model?.$hasColumn || !model?.$getColumn) return null
    if (!model.$hasColumn('deletedAt')) return null

    return model.$getColumn('deletedAt')?.columnName || 'deleted_at'
  }

  private supportsSoftDeletes(resource: any): boolean {
    return Boolean(resource?.softDeletes && this.getDeletedAtColumnName(resource.getModel()))
  }

  private applySoftDeleteScope(
    query: any,
    resource: any,
    trashed: 'without' | 'with' | 'only' = 'without'
  ) {
    if (!this.supportsSoftDeletes(resource)) return query

    const deletedAtColumn = this.getDeletedAtColumnName(resource.getModel())
    if (!deletedAtColumn) return query

    if (trashed === 'with') return query
    if (trashed === 'only') return query.whereNotNull(deletedAtColumn)

    return query.whereNull(deletedAtColumn)
  }

  private appendSoftDeleteActions(
    tableSchema: Record<string, any>,
    resource: any
  ): Record<string, any> {
    if (!this.supportsSoftDeletes(resource)) {
      return {
        ...tableSchema,
        supportsSoftDeletes: false,
      }
    }

    const actions = Array.isArray(tableSchema.actions) ? [...tableSchema.actions] : []
    const hasRestoreAction = actions.some((action: any) => action?.type === 'restore')
    const hasForceDeleteAction = actions.some((action: any) => action?.type === 'force-delete')

    if (!hasRestoreAction) {
      actions.push({
        type: 'restore',
        name: 'restore',
        label: 'Restore',
        icon: 'rotate-ccw',
        color: 'success',
        requiresConfirmation: true,
        confirmationTitle: 'Restore this item?',
        confirmationMessage: 'The record will be active again.',
        method: 'post',
      })
    }

    if (!hasForceDeleteAction) {
      actions.push({
        type: 'force-delete',
        name: 'force-delete',
        label: 'Delete permanently',
        icon: 'trash',
        color: 'danger',
        requiresConfirmation: true,
        confirmationTitle: 'Delete permanently?',
        confirmationMessage: 'This action is irreversible and permanently removes data.',
        method: 'delete',
      })
    }

    return {
      ...tableSchema,
      supportsSoftDeletes: true,
      actions,
    }
  }

  /**
   * Extract panel and resource from URL
   */
  private getContextFromUrl(url: string) {
    // URL format: /admin/users or /admin/users/create etc.
    const segments = url.split('/').filter(Boolean)

    // Find panel matching the first segment
    for (const panel of filament.getPanels()) {
      const panelPath = panel.path.replace(/^\//, '') // remove leading slash
      if (segments[0] === panelPath) {
        const resourceSlug = segments[1] // 'users'
        const resource = resourceSlug ? panel.getResourceBySlug(resourceSlug) : null
        return { panel, resource, resourceSlug }
      }
    }

    return { panel: null, resource: null, resourceSlug: null }
  }

  private async emitPanelEventFromUrl(
    url: string,
    name: string,
    payload: Record<string, any> = {},
    options: { failFast?: boolean } = {}
  ) {
    const { panel } = this.getContextFromUrl(url)
    if (!panel) return payload
    return filament.emitPanelEvent(panel, name, payload, options)
  }

  private async renderWithHooks(
    inertia: any,
    url: string,
    view: string,
    props: Record<string, any>
  ) {
    const eventPayload = {
      view,
      props,
    }

    await this.emitPanelEventFromUrl(url, 'render.before', eventPayload, { failFast: true })
    const rendered = inertia.render(eventPayload.view, eventPayload.props)
    await this.emitPanelEventFromUrl(url, 'render.after', eventPayload, { failFast: false })
    return rendered
  }

  private buildTableSchema(panel: any, resource: any): Record<string, any> {
    const schema = this.appendSoftDeleteActions(resource.getTableSchema(), resource)
    if (!panel || typeof panel.applyTableSchemaHooks !== 'function') {
      return schema
    }
    return panel.applyTableSchemaHooks(resource, schema)
  }

  /**
   * Get a nested value using a dot-notation path
   */
  private getValueByPath(record: Record<string, any>, path: string) {
    return path.split('.').reduce((value, segment) => value?.[segment], record as any)
  }

  /**
   * Normalize serialized relations for form fields.
   */
  private normalizeRecordForForm(resource: any, serializedRecord: Record<string, any>) {
    if (resource?.getModel?.()?.name === 'Post' && Array.isArray(serializedRecord.tags)) {
      serializedRecord.tags = serializedRecord.tags.map((tag: any) => tag.id)
    }
    return serializedRecord
  }

  private normalizeImportHeaderName(header: string): string {
    return header
      .trim()
      .replace(/[\s_-]+/g, '')
      .toLowerCase()
  }

  private resolveImportFieldName(header: string, formFieldNames: string[]): string | null {
    if (formFieldNames.includes(header)) {
      return header
    }

    const normalizedHeader = this.normalizeImportHeaderName(header)
    const match = formFieldNames.find(
      (name) => this.normalizeImportHeaderName(name) === normalizedHeader
    )
    return match || null
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
        continue
      }

      if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
        continue
      }

      current += char
    }

    values.push(current.trim())
    return values
  }

  private parseCsvContent(content: string): string[][] {
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => this.parseCsvLine(line))
  }

  private coerceImportValue(value: string): any {
    const trimmed = value.trim()
    if (trimmed === '') return undefined

    const lower = trimmed.toLowerCase()
    if (['true', 'yes', 'oui', '1'].includes(lower)) return true
    if (['false', 'no', 'non', '0'].includes(lower)) return false

    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed)
    }

    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))
    ) {
      try {
        return JSON.parse(trimmed)
      } catch {
        return trimmed
      }
    }

    return trimmed
  }

  private getMfaStateForUser(user: any) {
    const hasMfaEnabled = Boolean(user?.twoFactorSecret && user?.twoFactorConfirmedAt)
    const pendingSecret =
      typeof user?.$extras?.pendingMfaSecret === 'string' ? user.$extras.pendingMfaSecret : null

    return {
      enabled: hasMfaEnabled,
      confirmedAt: user?.twoFactorConfirmedAt ? String(user.twoFactorConfirmedAt) : null,
      hasPendingSetup: Boolean(pendingSecret),
    }
  }

  private getRecoveryHashes(user: any): string[] {
    if (!user?.twoFactorRecoveryCodes) return []
    try {
      const parsed = JSON.parse(user.twoFactorRecoveryCodes)
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
    } catch {
      return []
    }
  }

  private consumeRecoveryCode(user: any, rawCode: string): boolean {
    const normalized = normalizeRecoveryCode(rawCode)
    if (!normalized) return false

    const hashValue = hashRecoveryCode(normalized)
    const recoveryHashes = this.getRecoveryHashes(user)
    const index = recoveryHashes.indexOf(hashValue)
    if (index === -1) return false

    recoveryHashes.splice(index, 1)
    user.twoFactorRecoveryCodes = JSON.stringify(recoveryHashes)
    return true
  }

  public async dashboard({ inertia }: HttpContext) {
    return inertia.render('admin/dashboard', {
      panels: filament.getPanels().map((p) => ({ id: p.id, path: p.path })),
    })
  }

  public async globalSearch({ request, response }: HttpContext) {
    const query = request.input('query')
    if (!query || query.length < 2) return []

    const panel = filament.getCurrentPanel(request.url())
    if (!panel) return []

    const results = []

    for (const resource of panel.getResources()) {
      const resourceResults = await resource.getGlobalSearchResults(query)
      if (resourceResults.length > 0) {
        results.push({
          group: resource.getNavigationLabel(),
          items: resourceResults,
        })
      }
    }

    return response.json(results)
  }

  /**
   * Render a custom page (e.g. Settings)
   */
  public async page({ inertia, request }: HttpContext) {
    const { panel, resourceSlug } = this.getContextFromUrl(request.url())
    if (!panel)
      return this.renderWithHooks(inertia, request.url(), 'errors/not_found', {
        message: 'Panel not found',
      })

    const pageConstructor = panel.getPageBySlug(resourceSlug!)
    if (!pageConstructor) {
      return this.renderWithHooks(inertia, request.url(), 'errors/not_found', {
        message: 'Page not found',
      })
    }

    await this.emitPanelEventFromUrl(request.url(), 'page.view.before', {
      pageSlug: pageConstructor.slug,
    })

    // Instantiate page
    const page = new pageConstructor()
    const data = await page.getData()
    const formSchema = await page.getForm().toJson()

    const pageProps = {
      title: pageConstructor.label,
      slug: pageConstructor.slug,
      icon: pageConstructor.icon,
      formSchema,
      data,
    }

    await this.emitPanelEventFromUrl(
      request.url(),
      'page.view.after',
      {
        pageSlug: pageConstructor.slug,
      },
      { failFast: false }
    )

    return this.renderWithHooks(inertia, request.url(), 'admin/page', pageProps)
  }

  /**
   * Save a custom page
   */
  public async savePage({ request, response }: HttpContext) {
    const { panel, resourceSlug } = this.getContextFromUrl(request.url())
    if (!panel) return response.notFound()

    const pageConstructor = panel.getPageBySlug(resourceSlug!)
    if (!pageConstructor) return response.notFound()

    const page = new pageConstructor()
    const form = page.getForm()

    // Validation
    const validator = form.getValidationSchema({ model: null as any })
    const data = await request.validateUsing(validator)

    await this.emitPanelEventFromUrl(request.url(), 'page.save.before', {
      pageSlug: pageConstructor.slug,
    })

    await page.save(data)

    await this.emitPanelEventFromUrl(
      request.url(),
      'page.save.after',
      {
        pageSlug: pageConstructor.slug,
      },
      { failFast: false }
    )

    return response.redirect().back()
  }

  public async index({ inertia, request, auth }: HttpContext) {
    const { panel, resource } = this.getContextFromUrl(request.url())

    if (!resource) {
      return this.renderWithHooks(inertia, request.url(), 'errors/not_found', {
        message: 'Resource not found',
      })
    }

    await this.emitPanelEventFromUrl(request.url(), 'resource.index.before', {
      resourceSlug: resource.getSlug(),
      userId: auth.user?.id || null,
      query: request.qs?.() || {},
    })

    // Permission check
    const user = auth.user
    await this.emitPanelEventFromUrl(request.url(), 'auth.resource.viewAny.before', {
      resourceSlug: resource.getSlug(),
      userId: user?.id || null,
    })
    if (!(await resource.canViewAny(user))) {
      await this.emitPanelEventFromUrl(
        request.url(),
        'auth.resource.viewAny.denied',
        {
          resourceSlug: resource.getSlug(),
          userId: user?.id || null,
        },
        { failFast: false }
      )
      return this.renderWithHooks(inertia, request.url(), 'errors/forbidden', {
        message: 'Unauthorized access',
      })
    }
    await this.emitPanelEventFromUrl(
      request.url(),
      'auth.resource.viewAny.allowed',
      {
        resourceSlug: resource.getSlug(),
        userId: user?.id || null,
      },
      { failFast: false }
    )

    // Get permissions for frontend
    const permissions = await resource.getPermissions(user)

    const tableSchema = this.buildTableSchema(panel, resource)

    // Get query params
    const page = Math.max(1, Number(request.input('page', 1)) || 1)
    const perPage = Math.max(
      1,
      Number(request.input('perPage', tableSchema.perPage || 10)) ||
        Number(tableSchema.perPage || 10)
    )
    const search = request.input('search', '')
    const sortColumn = request.input('sortColumn', tableSchema.defaultSort?.column || 'id')
    const sortDirectionInput = request.input(
      'sortDirection',
      tableSchema.defaultSort?.direction || 'desc'
    )
    const sortDirection = sortDirectionInput === 'asc' ? 'asc' : 'desc'
    const filters = request.input('filters', {})
    const trashed = this.normalizeTrashedMode(request.input('trashed'))

    // Build query
    let query = resource.scopedQuery()
    query = this.applySoftDeleteScope(query, resource, trashed)

    // Load relations when relation columns exist in table schema
    const relationsToLoad = new Set<string>()
    for (const column of tableSchema.columns) {
      if (column.name.includes('.')) {
        const [relation] = column.name.split('.')
        relationsToLoad.add(relation)
      }
    }

    for (const relation of relationsToLoad) {
      query = query.preload(relation as any)
    }

    // Search on searchable columns (LIKE for SQLite, case-insensitive by default)
    const searchableColumns = (tableSchema.searchableColumns || []).filter(
      (column: string) => !column.includes('.')
    )
    if (search && searchableColumns.length > 0) {
      query = query.where((builder: any) => {
        for (const column of searchableColumns) {
          builder.orWhereLike(column, `%${search}%`)
        }
      })
    }

    // Filters
    for (const [key, value] of Object.entries(filters)) {
      if (key.includes('.')) continue
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'boolean' || value === 'true' || value === 'false') {
          query = query.where(key, value === true || value === 'true' ? 1 : 0)
        } else {
          query = query.where(key, value as any)
        }
      }
    }

    // Sort
    const sortableColumns = (tableSchema.sortableColumns || []).filter(
      (column: string) => !column.includes('.')
    )
    if (sortableColumns.includes(sortColumn)) {
      query = query.orderBy(sortColumn, sortDirection)
    }

    // Pagination
    const paginatedRecords = await query.paginate(page, perPage)

    const pageProps = {
      resource: {
        label: resource.getNavigationLabel(),
        singularLabel: resource.getSingularLabel(),
        slug: resource.getSlug(),
      },
      tableSchema,
      records: paginatedRecords.serialize(),
      permissions,
      queryParams: {
        page,
        perPage,
        search,
        sortColumn,
        sortDirection,
        filters,
        trashed,
      },
    }

    await this.emitPanelEventFromUrl(
      request.url(),
      'resource.index.after',
      {
        resourceSlug: resource.getSlug(),
        recordsCount: Array.isArray(pageProps.records?.data) ? pageProps.records.data.length : 0,
        queryParams: pageProps.queryParams,
      },
      { failFast: false }
    )

    return this.renderWithHooks(inertia, request.url(), 'admin/resource/index', pageProps)
  }

  public async create({ inertia, request, auth }: HttpContext) {
    const { resource } = this.getContextFromUrl(request.url())

    if (!resource) {
      return this.renderWithHooks(inertia, request.url(), 'errors/not_found', {
        message: 'Resource not found',
      })
    }

    // Permission check
    await this.emitPanelEventFromUrl(request.url(), 'auth.resource.create.before', {
      resourceSlug: resource.getSlug(),
      userId: auth.user?.id || null,
    })
    if (!(await resource.canCreate(auth.user))) {
      await this.emitPanelEventFromUrl(
        request.url(),
        'auth.resource.create.denied',
        {
          resourceSlug: resource.getSlug(),
          userId: auth.user?.id || null,
        },
        { failFast: false }
      )
      return this.renderWithHooks(inertia, request.url(), 'errors/forbidden', {
        message: 'Unauthorized access',
      })
    }
    await this.emitPanelEventFromUrl(
      request.url(),
      'auth.resource.create.allowed',
      {
        resourceSlug: resource.getSlug(),
        userId: auth.user?.id || null,
      },
      { failFast: false }
    )

    return this.renderWithHooks(inertia, request.url(), 'admin/resource/create', {
      resource: {
        label: resource.getNavigationLabel(),
        singularLabel: resource.getSingularLabel(),
        slug: resource.getSlug(),
      },
      formSchema: await resource.getForm().toJson(),
    })
  }

  public async store({ request, response, auth }: HttpContext) {
    const { resource } = this.getContextFromUrl(request.url())

    if (!resource) {
      return response.notFound({ message: 'Resource not found' })
    }

    // Permission check
    if (!(await resource.canCreate(auth.user))) {
      return response.forbidden({ message: 'Unauthorized access' })
    }

    await this.emitPanelEventFromUrl(request.url(), 'resource.store.before', {
      resourceSlug: resource.getSlug(),
      userId: auth.user?.id || null,
    })

    const model = resource.getModel()
    const form = resource.getForm()

    // Automatic validation with VineJS
    const validator = form.getValidationSchema({ model })
    const data = await request.validateUsing(validator)

    // Filter empty values, handle files, and split relations
    const filteredData: Record<string, unknown> = {}
    const relationsData: Record<string, any[]> = {}

    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined && value !== '') {
        // Handle uploaded files
        if (value && typeof value === 'object' && 'move' in value && 'clientName' in value) {
          const file = value as any
          await file.moveApplicationPath('public/uploads', {
            name: `${new Date().getTime()}_${file.clientName}`,
          })
          filteredData[key] = `uploads/${file.fileName}`
        }
        // Handle relations (ID arrays for many-to-many)
        else if (Array.isArray(value)) {
          // Assume this is a relation to sync (e.g. tags)
          // Check whether the relation exists on the model
          // Store separately for now
          relationsData[key] = value
        } else {
          filteredData[key] = value
        }
      }
    }

    if (resource.tenantScoped && filteredData.tenantId === undefined) {
      const tenantId = getCurrentTenantId()
      if (tenantId) {
        filteredData.tenantId = tenantId
      }
    }

    const record = await model.create(filteredData)

    // Save relations
    for (const [relationName, ids] of Object.entries(relationsData)) {
      const relation = (record as any).related(relationName)
      if (relation) {
        await relation.attach(ids)
      }
    }

    const panelPath = filament.getCurrentPanel(request.url())?.path || '/admin'
    await this.emitPanelEventFromUrl(
      request.url(),
      'resource.store.after',
      {
        resourceSlug: resource.getSlug(),
        userId: auth.user?.id || null,
        recordId: (record as any).id,
      },
      { failFast: false }
    )
    return response.redirect(`${panelPath}/${resource.getSlug()}`)
  }

  public async show({ inertia, request, params, auth }: HttpContext) {
    const { resource } = this.getContextFromUrl(request.url())

    if (!resource) {
      return this.renderWithHooks(inertia, request.url(), 'errors/not_found', {
        message: 'Resource not found',
      })
    }

    await this.emitPanelEventFromUrl(request.url(), 'auth.resource.view.before', {
      resourceSlug: resource.getSlug(),
      recordId: Number.parseInt(params.id, 10),
      userId: auth.user?.id || null,
    })
    if (!(await resource.canView(auth.user))) {
      await this.emitPanelEventFromUrl(
        request.url(),
        'auth.resource.view.denied',
        {
          resourceSlug: resource.getSlug(),
          recordId: Number.parseInt(params.id, 10),
          userId: auth.user?.id || null,
        },
        { failFast: false }
      )
      return this.renderWithHooks(inertia, request.url(), 'errors/forbidden', {
        message: 'Unauthorized access',
      })
    }

    const model = resource.getModel()
    let query = resource.scopedQuery()
    query = this.applySoftDeleteScope(query, resource, 'with')

    if (model.name === 'Post') {
      query = (query as any).preload('tags')
    }

    const record = await query.where('id', Number.parseInt(params.id, 10)).firstOrFail()
    const serializedRecord = this.normalizeRecordForForm(resource, record.serialize())

    const pageProps = {
      resource: {
        label: resource.getNavigationLabel(),
        singularLabel: resource.getSingularLabel(),
        slug: resource.getSlug(),
      },
      formSchema: await resource.getForm().toJson(),
      record: serializedRecord,
      permissions: {
        canUpdate: await resource.canUpdate(auth.user, record),
      },
    }

    await this.emitPanelEventFromUrl(
      request.url(),
      'resource.show.after',
      {
        resourceSlug: resource.getSlug(),
        recordId: Number.parseInt(params.id, 10),
      },
      { failFast: false }
    )

    return this.renderWithHooks(inertia, request.url(), 'admin/resource/view', pageProps)
  }

  public async edit({ inertia, request, params, auth }: HttpContext) {
    const { resource } = this.getContextFromUrl(request.url())

    if (!resource) {
      return this.renderWithHooks(inertia, request.url(), 'errors/not_found', {
        message: 'Resource not found',
      })
    }

    // Permission check
    await this.emitPanelEventFromUrl(request.url(), 'auth.resource.update.before', {
      resourceSlug: resource.getSlug(),
      recordId: Number.parseInt(params.id, 10),
      userId: auth.user?.id || null,
    })
    if (!(await resource.canUpdate(auth.user))) {
      await this.emitPanelEventFromUrl(
        request.url(),
        'auth.resource.update.denied',
        {
          resourceSlug: resource.getSlug(),
          recordId: Number.parseInt(params.id, 10),
          userId: auth.user?.id || null,
        },
        { failFast: false }
      )
      return this.renderWithHooks(inertia, request.url(), 'errors/forbidden', {
        message: 'Unauthorized access',
      })
    }

    const model = resource.getModel()
    let query = resource.scopedQuery()
    query = this.applySoftDeleteScope(query, resource)

    // Preload tags when available (temporary hack, should be schema-driven)
    if (model.name === 'Post') {
      // Or check whether the tags relation exists
      query = (query as any).preload('tags')
    }

    const record = await query.where('id', Number.parseInt(params.id, 10)).firstOrFail()

    // Serialize with relations
    const serializedRecord = this.normalizeRecordForForm(resource, record.serialize())

    return this.renderWithHooks(inertia, request.url(), 'admin/resource/edit', {
      resource: {
        label: resource.getNavigationLabel(),
        singularLabel: resource.getSingularLabel(),
        slug: resource.getSlug(),
      },
      formSchema: await resource.getForm().toJson(),
      record: serializedRecord,
    })
  }

  public async update({ request, response, params, auth }: HttpContext) {
    const { resource } = this.getContextFromUrl(request.url())

    if (!resource) {
      return response.notFound({ message: 'Resource not found' })
    }

    // Permission check
    if (!(await resource.canUpdate(auth.user))) {
      return response.forbidden({ message: 'Unauthorized access' })
    }

    await this.emitPanelEventFromUrl(request.url(), 'resource.update.before', {
      resourceSlug: resource.getSlug(),
      recordId: Number.parseInt(params.id, 10),
      userId: auth.user?.id || null,
    })

    const model = resource.getModel()
    const recordId = Number.parseInt(params.id, 10)
    let scopedQuery = resource.scopedQuery()
    scopedQuery = this.applySoftDeleteScope(scopedQuery, resource)
    const record = await scopedQuery.where('id', recordId).firstOrFail()
    const form = resource.getForm()

    // Automatic validation with VineJS (pass recordId for unique rules)
    const validator = form.getValidationSchema({ recordId, model })
    const data = await request.validateUsing(validator)

    // Filter empty values (e.g. empty password on edit)
    const filteredData: Record<string, unknown> = {}
    const relationsData: Record<string, any[]> = {}

    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined && value !== '') {
        // Handle uploaded files
        if (value && typeof value === 'object' && 'move' in value && 'clientName' in value) {
          const file = value as any
          await file.moveApplicationPath('public/uploads', {
            name: `${new Date().getTime()}_${file.clientName}`,
          })
          filteredData[key] = `uploads/${file.fileName}`
        }
        // Handle relations (ID arrays)
        else if (Array.isArray(value)) {
          relationsData[key] = value
        } else {
          filteredData[key] = value
        }
      }
    }

    record.merge(filteredData)
    await record.save()

    // Save relations (sync pour update)
    for (const [relationName, ids] of Object.entries(relationsData)) {
      // @ts-ignore
      if (record[relationName] !== undefined || record.related(relationName)) {
        try {
          const relation = (record as any).related(relationName)
          // Check whether relation supports sync/attach/detach
          if (relation && typeof relation.sync === 'function') {
            await relation.sync(ids)
          }
        } catch (e) {
          console.error(`Error while syncing relation ${relationName}:`, e)
        }
      }
    }

    const panelPath = filament.getCurrentPanel(request.url())?.path || '/admin'
    await this.emitPanelEventFromUrl(
      request.url(),
      'resource.update.after',
      {
        resourceSlug: resource.getSlug(),
        recordId,
        userId: auth.user?.id || null,
      },
      { failFast: false }
    )
    return response.redirect(`${panelPath}/${resource.getSlug()}`)
  }

  public async destroy({ request, response, params, auth }: HttpContext) {
    const { resource } = this.getContextFromUrl(request.url())

    if (!resource) {
      return response.notFound({ message: 'Resource not found' })
    }

    // Permission check
    if (!(await resource.canDelete(auth.user))) {
      return response.forbidden({ message: 'Unauthorized access' })
    }

    await this.emitPanelEventFromUrl(request.url(), 'resource.destroy.before', {
      resourceSlug: resource.getSlug(),
      recordId: Number.parseInt(params.id, 10),
      userId: auth.user?.id || null,
    })

    const supportsSoftDeletes = this.supportsSoftDeletes(resource)
    let scopedQuery = resource.scopedQuery()
    scopedQuery = this.applySoftDeleteScope(
      scopedQuery,
      resource,
      supportsSoftDeletes ? 'without' : 'with'
    )
    const record = await scopedQuery.where('id', Number.parseInt(params.id, 10)).firstOrFail()

    if (supportsSoftDeletes) {
      record.merge({ deletedAt: DateTime.now() } as any)
      await record.save()
    } else {
      await record.delete()
    }

    const panelPath = filament.getCurrentPanel(request.url())?.path || '/admin'
    await this.emitPanelEventFromUrl(
      request.url(),
      'resource.destroy.after',
      {
        resourceSlug: resource.getSlug(),
        recordId: Number.parseInt(params.id, 10),
        softDelete: supportsSoftDeletes,
      },
      { failFast: false }
    )
    return response.redirect(`${panelPath}/${resource.getSlug()}`)
  }

  public async restore({ request, response, params, auth }: HttpContext) {
    const { resource } = this.getContextFromUrl(request.url())

    if (!resource) {
      return response.notFound({ message: 'Resource not found' })
    }

    if (!(await resource.canDelete(auth.user))) {
      return response.forbidden({ message: 'Unauthorized access' })
    }

    if (!this.supportsSoftDeletes(resource)) {
      return response.badRequest({ message: 'Soft deletes are not enabled for this resource' })
    }

    await this.emitPanelEventFromUrl(request.url(), 'resource.restore.before', {
      resourceSlug: resource.getSlug(),
      recordId: Number.parseInt(params.id, 10),
      userId: auth.user?.id || null,
    })

    let scopedQuery = resource.scopedQuery()
    scopedQuery = this.applySoftDeleteScope(scopedQuery, resource, 'only')
    const record = await scopedQuery.where('id', Number.parseInt(params.id, 10)).firstOrFail()

    record.merge({ deletedAt: null } as any)
    await record.save()

    await this.emitPanelEventFromUrl(
      request.url(),
      'resource.restore.after',
      {
        resourceSlug: resource.getSlug(),
        recordId: Number.parseInt(params.id, 10),
      },
      { failFast: false }
    )

    return response.json({
      success: true,
      restoredId: (record as any).id,
    })
  }

  public async forceDestroy({ request, response, params, auth }: HttpContext) {
    const { resource } = this.getContextFromUrl(request.url())

    if (!resource) {
      return response.notFound({ message: 'Resource not found' })
    }

    if (!(await resource.canDelete(auth.user))) {
      return response.forbidden({ message: 'Unauthorized access' })
    }

    await this.emitPanelEventFromUrl(request.url(), 'resource.forceDestroy.before', {
      resourceSlug: resource.getSlug(),
      recordId: Number.parseInt(params.id, 10),
      userId: auth.user?.id || null,
    })

    let scopedQuery = resource.scopedQuery()
    scopedQuery = this.applySoftDeleteScope(scopedQuery, resource, 'with')
    const record = await scopedQuery.where('id', Number.parseInt(params.id, 10)).firstOrFail()

    await record.delete()

    await this.emitPanelEventFromUrl(
      request.url(),
      'resource.forceDestroy.after',
      {
        resourceSlug: resource.getSlug(),
        recordId: Number.parseInt(params.id, 10),
      },
      { failFast: false }
    )

    return response.json({
      success: true,
      deletedId: Number.parseInt(params.id, 10),
    })
  }

  /**
   * Duplicate a record
   */
  public async clone({ request, response, params, auth }: HttpContext) {
    const { resource } = this.getContextFromUrl(request.url())

    if (!resource) {
      return response.notFound({ message: 'Resource not found' })
    }

    if (!(await resource.canView(auth.user)) || !(await resource.canCreate(auth.user))) {
      return response.forbidden({ message: 'Unauthorized access' })
    }

    await this.emitPanelEventFromUrl(request.url(), 'resource.clone.before', {
      resourceSlug: resource.getSlug(),
      sourceRecordId: Number.parseInt(params.id, 10),
      userId: auth.user?.id || null,
    })

    const model = resource.getModel()
    let scopedQuery = resource.scopedQuery()
    scopedQuery = this.applySoftDeleteScope(scopedQuery, resource)
    const originalRecord = await scopedQuery
      .where('id', Number.parseInt(params.id, 10))
      .firstOrFail()

    // Get serialized data and remove non-cloneable fields
    const originalData = originalRecord.serialize()
    delete originalData.id
    delete originalData.createdAt
    delete originalData.updatedAt
    delete originalData.deletedAt

    if (resource.tenantScoped && originalData.tenantId === undefined) {
      const tenantId = getCurrentTenantId()
      if (tenantId) {
        originalData.tenantId = tenantId
      }
    }

    // Create a copy
    const clonedRecord = await model.create(originalData)

    const panelPath = filament.getCurrentPanel(request.url())?.path || '/admin'

    // Return JSON so the frontend can show a notification
    await this.emitPanelEventFromUrl(
      request.url(),
      'resource.clone.after',
      {
        resourceSlug: resource.getSlug(),
        sourceRecordId: Number.parseInt(params.id, 10),
        newRecordId: (clonedRecord as any).id,
        userId: auth.user?.id || null,
      },
      { failFast: false }
    )

    return response.json({
      success: true,
      message: 'Record duplicated successfully',
      record: clonedRecord.serialize(),
      redirectUrl: `${panelPath}/${resource.getSlug()}/${(clonedRecord as any).id}/edit`,
    })
  }

  /**
   * Bulk deletion (bulk delete)
   */
  public async bulkDestroy({ request, response, auth }: HttpContext) {
    const { resource } = this.getContextFromUrl(request.url())

    if (!resource) {
      return response.notFound({ message: 'Resource not found' })
    }

    if (!(await resource.canDelete(auth.user))) {
      return response.forbidden({ message: 'Unauthorized access' })
    }

    await this.emitPanelEventFromUrl(request.url(), 'resource.bulkDestroy.before', {
      resourceSlug: resource.getSlug(),
      userId: auth.user?.id || null,
    })

    const ids = request.input('ids', [])
    const trashed = this.normalizeTrashedMode(request.input('trashed'))

    if (!Array.isArray(ids) || ids.length === 0) {
      return response.badRequest({ message: 'No ids provided' })
    }

    let bulkQuery = resource.scopedQuery()
    bulkQuery = this.applySoftDeleteScope(bulkQuery, resource, trashed)

    const deletedAtColumn = this.getDeletedAtColumnName(resource.getModel())
    let deletedCount = 0

    if (this.supportsSoftDeletes(resource) && deletedAtColumn) {
      if (trashed === 'only') {
        deletedCount = Number(await bulkQuery.whereIn('id', ids).delete())
        await this.emitPanelEventFromUrl(
          request.url(),
          'resource.bulkDestroy.after',
          {
            resourceSlug: resource.getSlug(),
            deletedCount: deletedCount || 0,
            mode: 'force',
          },
          { failFast: false }
        )
        return response.json({ success: true, deletedCount: deletedCount || 0, mode: 'force' })
      }

      bulkQuery = this.applySoftDeleteScope(resource.scopedQuery(), resource, 'without')
      const now = DateTime.now().toSQL({ includeOffset: false }) || DateTime.now().toISO()
      deletedCount = Number(await bulkQuery.whereIn('id', ids).update({ [deletedAtColumn]: now }))
      await this.emitPanelEventFromUrl(
        request.url(),
        'resource.bulkDestroy.after',
        {
          resourceSlug: resource.getSlug(),
          deletedCount: deletedCount || 0,
          mode: 'soft',
        },
        { failFast: false }
      )
      return response.json({ success: true, deletedCount: deletedCount || 0, mode: 'soft' })
    } else {
      deletedCount = Number(await bulkQuery.whereIn('id', ids).delete())
    }

    await this.emitPanelEventFromUrl(
      request.url(),
      'resource.bulkDestroy.after',
      {
        resourceSlug: resource.getSlug(),
        deletedCount: deletedCount || 0,
        mode: 'hard',
      },
      { failFast: false }
    )
    return response.json({ success: true, deletedCount: deletedCount || 0 })
  }

  /**
   * Import data from CSV
   */
  public async import({ request, response, auth }: HttpContext) {
    const { resource } = this.getContextFromUrl(request.url())

    if (!resource) {
      return response.notFound({ message: 'Resource not found' })
    }

    if (!(await resource.canCreate(auth.user))) {
      return response.forbidden({ message: 'Unauthorized access' })
    }

    await this.emitPanelEventFromUrl(request.url(), 'resource.import.before', {
      resourceSlug: resource.getSlug(),
      userId: auth.user?.id || null,
    })

    const rawMaxRows = Number(request.input('maxRows', 1000))
    const maxRows = Number.isFinite(rawMaxRows) ? Math.max(1, Math.min(rawMaxRows, 10000)) : 1000
    const importFile = (request as any).file?.('file')
    let csvContent = ''

    if (importFile?.tmpPath) {
      const extension = String(importFile.extname || '').toLowerCase()
      if (extension && extension !== 'csv') {
        return response.badRequest({
          message: 'Only CSV files are currently supported',
        })
      }
      csvContent = await readFile(importFile.tmpPath, 'utf-8')
    } else {
      const fallbackContent = request.input('content')
      if (typeof fallbackContent !== 'string' || fallbackContent.trim() === '') {
        return response.badRequest({ message: 'No CSV file provided' })
      }
      csvContent = fallbackContent
    }

    const rows = this.parseCsvContent(csvContent)
    if (rows.length < 2) {
      return response.badRequest({
        message: 'CSV file must include a header and at least one row',
      })
    }

    const headers = rows[0]
    const dataRows = rows.slice(1, maxRows + 1)
    const model = resource.getModel()
    const formFieldNames = resource
      .getForm()
      .getFields()
      .map((field: any) => field.getName())
    const systemFields = new Set(['id', 'createdAt', 'updatedAt', 'deletedAt'])

    const mappedHeaders = headers
      .map((header, index) => ({
        index,
        key: this.resolveImportFieldName(header, formFieldNames),
      }))
      .filter((entry) => entry.key && !systemFields.has(entry.key))

    if (mappedHeaders.length === 0) {
      return response.badRequest({
        message: 'No CSV column matches the resource form fields',
      })
    }

    let importedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (const [rowIndex, row] of dataRows.entries()) {
      const payload: Record<string, any> = {}

      for (const mapping of mappedHeaders) {
        const key = mapping.key!
        const cellValue = row[mapping.index] ?? ''
        const value = this.coerceImportValue(cellValue)
        if (value !== undefined) {
          payload[key] = value
        }
      }

      if (Object.keys(payload).length === 0) {
        skippedCount += 1
        continue
      }

      if (resource.tenantScoped && payload.tenantId === undefined) {
        const tenantId = getCurrentTenantId()
        if (tenantId) {
          payload.tenantId = tenantId
        }
      }

      try {
        await model.create(payload)
        importedCount += 1
      } catch (error: any) {
        skippedCount += 1
        if (errors.length < 20) {
          errors.push(`Row ${rowIndex + 2}: ${error?.message || 'validation error'}`)
        }
      }
    }

    await this.emitPanelEventFromUrl(
      request.url(),
      'resource.import.after',
      {
        resourceSlug: resource.getSlug(),
        importedCount,
        skippedCount,
        processedRows: dataRows.length,
        userId: auth.user?.id || null,
      },
      { failFast: false }
    )

    return response.json({
      success: true,
      importedCount,
      skippedCount,
      processedRows: dataRows.length,
      hasMoreRows: rows.length > dataRows.length + 1,
      errors,
    })
  }

  /**
   * Switch current tenant (stored in session).
   */
  public async switchTenant(ctx: HttpContext) {
    const { request, response, auth, session } = ctx
    const user = auth.user as any
    if (!user) {
      return response.forbidden({ message: 'Unauthorized access' })
    }

    const tenantId = Number(request.input('tenantId'))
    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      return response.badRequest({ message: 'Invalid tenantId' })
    }

    const tenant = await resolveTenantById(tenantId, ctx)
    if (!tenant) {
      return response.notFound({ message: 'Tenant not found' })
    }

    if (!isTenantActive(tenant as any)) {
      return response.forbidden({ message: 'This tenant is inactive' })
    }

    if (!user.isAdmin && user.tenantId !== tenant.id) {
      return response.forbidden({ message: 'Unauthorized access for this tenant' })
    }

    session.put('filament.current_tenant_id', tenant.id)

    return response.json({
      success: true,
      tenant: serializeTenant(tenant as any),
    })
  }

  /**
   * Clear forced tenant from session.
   */
  public async clearTenant({ response, session }: HttpContext) {
    session.forget('filament.current_tenant_id')

    return response.json({
      success: true,
    })
  }

  public async mfaChallenge({ inertia, request, response, auth, session }: HttpContext) {
    const user = auth.user as any
    if (!user) {
      return inertia.render('errors/forbidden', { message: 'Unauthorized access' })
    }

    if (!(user.twoFactorSecret && user.twoFactorConfirmedAt)) {
      const panelPath = filament.getCurrentPanel(request.url())?.path || '/admin'
      return response.redirect(panelPath)
    }

    return inertia.render('admin/security/mfa_challenge', {
      panelPath: filament.getCurrentPanel(request.url())?.path || '/admin',
      sessionMfaVerified:
        Number(session.get('filament.mfa.verified_user_id') || 0) === Number(user.id),
    })
  }

  public async verifyMfaChallenge({ request, response, auth, session }: HttpContext) {
    const user = auth.user as any
    if (!user) {
      return response.forbidden({ message: 'Unauthorized access' })
    }

    if (!(user.twoFactorSecret && user.twoFactorConfirmedAt)) {
      return response.badRequest({ message: 'MFA is not enabled on this account' })
    }

    const code = String(request.input('code', '')).trim()
    const recoveryCode = String(request.input('recoveryCode', '')).trim()

    const validTotp = code ? verifyTotpToken({ secret: user.twoFactorSecret, token: code }) : false
    let usedRecoveryCode = false

    if (!validTotp && recoveryCode) {
      usedRecoveryCode = this.consumeRecoveryCode(user, recoveryCode)
      if (usedRecoveryCode) {
        await user.save()
      }
    }

    if (!validTotp && !usedRecoveryCode) {
      return response.badRequest({ message: 'Invalid MFA code' })
    }

    session.put('filament.mfa.verified_user_id', Number(user.id))

    return response.json({
      success: true,
      usedRecoveryCode,
    })
  }

  public async mfaSettings({ inertia, request, auth, session }: HttpContext) {
    const user = auth.user as any
    if (!user) {
      return inertia.render('errors/forbidden', { message: 'Unauthorized access' })
    }

    const pendingSecret = session.get('filament.mfa.pending_secret')
    if (typeof pendingSecret === 'string' && pendingSecret.length > 0) {
      user.$extras = {
        ...(user.$extras || {}),
        pendingMfaSecret: pendingSecret,
      }
    }

    const panelPath = filament.getCurrentPanel(request.url())?.path || '/admin'

    return inertia.render('admin/security/mfa', {
      panelPath,
      mfa: this.getMfaStateForUser(user),
      pendingSetup: pendingSecret
        ? {
            secret: pendingSecret,
            otpAuthUri: buildOtpAuthUri({
              secret: pendingSecret,
              issuer: 'Adonis Admin Engine',
              accountName: user.email || `user-${user.id}`,
            }),
          }
        : null,
      recoveryCodesCount: this.getRecoveryHashes(user).length,
    })
  }

  public async setupMfa({ response, auth, session }: HttpContext) {
    const user = auth.user as any
    if (!user) {
      return response.forbidden({ message: 'Unauthorized access' })
    }

    const secret = generateTotpSecret()
    session.put('filament.mfa.pending_secret', secret)

    const otpAuthUri = buildOtpAuthUri({
      secret,
      issuer: 'Adonis Admin Engine',
      accountName: user.email || `user-${user.id}`,
    })

    return response.json({
      success: true,
      pendingSetup: {
        secret,
        otpAuthUri,
      },
    })
  }

  public async confirmMfa({ request, response, auth, session }: HttpContext) {
    const user = auth.user as any
    if (!user) {
      return response.forbidden({ message: 'Unauthorized access' })
    }

    const pendingSecret = String(session.get('filament.mfa.pending_secret') || '')
    if (!pendingSecret) {
      return response.badRequest({ message: 'No pending MFA setup' })
    }

    const code = String(request.input('code', '')).trim()
    if (!verifyTotpToken({ secret: pendingSecret, token: code })) {
      return response.badRequest({ message: 'Invalid MFA code' })
    }

    const recoveryCodes = generateRecoveryCodes(8)
    const recoveryHashes = recoveryCodes.map((item) => hashRecoveryCode(item))

    user.twoFactorSecret = pendingSecret
    user.twoFactorRecoveryCodes = JSON.stringify(recoveryHashes)
    user.twoFactorConfirmedAt = DateTime.now()
    await user.save()

    session.forget('filament.mfa.pending_secret')
    session.put('filament.mfa.verified_user_id', Number(user.id))

    return response.json({
      success: true,
      recoveryCodes,
      mfa: this.getMfaStateForUser(user),
    })
  }

  public async disableMfa({ request, response, auth, session }: HttpContext) {
    const user = auth.user as any
    if (!user) {
      return response.forbidden({ message: 'Unauthorized access' })
    }

    if (!(user.twoFactorSecret && user.twoFactorConfirmedAt)) {
      return response.badRequest({ message: 'MFA is not enabled' })
    }

    const code = String(request.input('code', '')).trim()
    const password = String(request.input('password', '')).trim()
    const recoveryCode = String(request.input('recoveryCode', '')).trim()

    let allowed = false

    if (password) {
      allowed = await hash.verify(user.password, password)
    }

    if (!allowed && code) {
      allowed = verifyTotpToken({ secret: user.twoFactorSecret, token: code })
    }

    if (!allowed && recoveryCode) {
      allowed = this.consumeRecoveryCode(user, recoveryCode)
    }

    if (!allowed) {
      return response.badRequest({ message: 'Unable to disable MFA: invalid verification' })
    }

    user.twoFactorSecret = null
    user.twoFactorRecoveryCodes = null
    user.twoFactorConfirmedAt = null
    await user.save()

    session.forget('filament.mfa.pending_secret')
    session.forget('filament.mfa.verified_user_id')

    return response.json({
      success: true,
      mfa: this.getMfaStateForUser(user),
    })
  }

  public async regenerateMfaRecoveryCodes({ request, response, auth }: HttpContext) {
    const user = auth.user as any
    if (!user) {
      return response.forbidden({ message: 'Unauthorized access' })
    }

    if (!(user.twoFactorSecret && user.twoFactorConfirmedAt)) {
      return response.badRequest({ message: 'MFA is not enabled' })
    }

    const code = String(request.input('code', '')).trim()
    if (!verifyTotpToken({ secret: user.twoFactorSecret, token: code })) {
      return response.badRequest({ message: 'Invalid MFA code' })
    }

    const recoveryCodes = generateRecoveryCodes(8)
    const recoveryHashes = recoveryCodes.map((item) => hashRecoveryCode(item))
    user.twoFactorRecoveryCodes = JSON.stringify(recoveryHashes)
    await user.save()

    return response.json({
      success: true,
      recoveryCodes,
    })
  }

  /**
   * Export data (CSV, XLSX)
   */
  public async export({ request, response, params, auth }: HttpContext) {
    const { panel, resource } = this.getContextFromUrl(request.url())

    if (!resource) {
      return response.notFound({ message: 'Resource not found' })
    }

    if (!(await resource.canViewAny(auth.user))) {
      return response.forbidden({ message: 'Unauthorized access' })
    }

    const format = params.format as 'csv' | 'xlsx'
    const tableSchema = this.buildTableSchema(panel, resource)

    await this.emitPanelEventFromUrl(request.url(), 'resource.export.before', {
      resourceSlug: resource.getSlug(),
      format,
      userId: auth.user?.id || null,
    })

    // Get all data (including optional filters)
    const search = request.input('search', '')
    const filters = request.input('filters', {})
    const trashed = this.normalizeTrashedMode(request.input('trashed'))

    let query = resource.scopedQuery()
    query = this.applySoftDeleteScope(query, resource, trashed)

    // Preload relations used by relation columns
    const relationsToLoad = new Set<string>()
    for (const column of tableSchema.columns) {
      if (column.name.includes('.')) {
        const [relation] = column.name.split('.')
        relationsToLoad.add(relation)
      }
    }

    for (const relation of relationsToLoad) {
      query = query.preload(relation as any)
    }

    // Apply search (LIKE for SQLite)
    const searchableColumns = (tableSchema.searchableColumns || []).filter(
      (column: string) => !column.includes('.')
    )
    if (search && searchableColumns.length > 0) {
      query = query.where((builder: any) => {
        for (const column of searchableColumns) {
          builder.orWhereLike(column, `%${search}%`)
        }
      })
    }

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (key.includes('.')) continue
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'boolean' || value === 'true' || value === 'false') {
          query = query.where(key, value === true || value === 'true' ? 1 : 0)
        } else {
          query = query.where(key, value as any)
        }
      }
    }

    const records = await query

    // Get visible columns
    const columns = tableSchema.columns.filter((col: any) => !col.hidden)

    if (format === 'csv') {
      // Generate CSV
      const headers = columns.map((col: any) => col.label).join(',')
      const rows = records.map((record: any) => {
        const serialized = record.serialize()
        return columns
          .map((col: any) => {
            const value = this.getValueByPath(serialized, col.name)
            // Escape CSV values
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value ?? ''
          })
          .join(',')
      })

      const csv = [headers, ...rows].join('\n')

      response.header('Content-Type', 'text/csv')
      response.header(
        'Content-Disposition',
        `attachment; filename="${resource.getSlug()}-export.csv"`
      )
      await this.emitPanelEventFromUrl(
        request.url(),
        'resource.export.after',
        {
          resourceSlug: resource.getSlug(),
          format,
          recordsCount: records.length,
        },
        { failFast: false }
      )
      return response.send(csv)
    }

    // For XLSX, return JSON data (handled by frontend)
    await this.emitPanelEventFromUrl(
      request.url(),
      'resource.export.after',
      {
        resourceSlug: resource.getSlug(),
        format,
        recordsCount: records.length,
      },
      { failFast: false }
    )
    return response.json({
      columns: columns.map((col: any) => ({ name: col.name, label: col.label })),
      data: records.map((record: any) => record.serialize()),
    })
  }
}
