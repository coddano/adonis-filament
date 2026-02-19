import { test } from '@japa/runner'
import AdminController from '#filament/Core/AdminController'
import filament from '#filament/Core/FilamentManager'
import { Panel } from '#filament/Core/Panel'
import { generateTotpToken } from '#filament/Support/Totp'

type QueryState = {
  whereCalls: Array<[string, any]>
  whereNullCalls: string[]
  whereNotNullCalls: string[]
  whereLikeCalls: Array<[string, string]>
  orderByCalls: Array<[string, string]>
  preloadCalls: string[]
  whereInCalls: Array<[string, any[]]>
  updatePayloads: Array<Record<string, any>>
  updateCount: number
  deleteCount: number
  deleteCalled: boolean
  paginateArgs: { page: number; perPage: number } | null
  records: any[]
  paginatedData: { data: any[]; meta: Record<string, any> }
}

function createFakeQuery(overrides: Partial<QueryState> = {}) {
  const state: QueryState = {
    whereCalls: [],
    whereNullCalls: [],
    whereNotNullCalls: [],
    whereLikeCalls: [],
    orderByCalls: [],
    preloadCalls: [],
    whereInCalls: [],
    updatePayloads: [],
    updateCount: 0,
    deleteCount: 0,
    deleteCalled: false,
    paginateArgs: null,
    records: [],
    paginatedData: {
      data: [],
      meta: { currentPage: 1, perPage: 10, total: 0, lastPage: 1 },
    },
    ...overrides,
  }

  const query: any = {
    __state: state,
    where(columnOrCallback: string | ((builder: any) => void), value?: any) {
      if (typeof columnOrCallback === 'function') {
        const builder = {
          orWhereLike: (column: string, likeValue: string) => {
            state.whereLikeCalls.push([column, likeValue])
            return builder
          },
        }
        columnOrCallback(builder)
      } else {
        state.whereCalls.push([columnOrCallback, value])
      }
      return query
    },
    whereNull(column: string) {
      state.whereNullCalls.push(column)
      return query
    },
    whereNotNull(column: string) {
      state.whereNotNullCalls.push(column)
      return query
    },
    whereIn(column: string, values: any[]) {
      state.whereInCalls.push([column, values])
      return query
    },
    preload(relation: string) {
      state.preloadCalls.push(relation)
      return query
    },
    orderBy(column: string, direction: string) {
      state.orderByCalls.push([column, direction])
      return query
    },
    update(payload: Record<string, any>) {
      state.updatePayloads.push(payload)
      return Promise.resolve(state.updateCount)
    },
    delete() {
      state.deleteCalled = true
      return Promise.resolve(state.deleteCount)
    },
    paginate(page: number, perPage: number) {
      state.paginateArgs = { page, perPage }
      return Promise.resolve({
        serialize: () => state.paginatedData,
      })
    },
    firstOrFail() {
      throw new Error('firstOrFail not configured')
    },
    then(resolve: (value: any[]) => any, reject: (reason: any) => any) {
      return Promise.resolve(state.records).then(resolve, reject)
    },
  }

  return query
}

function createFakeRecord(initial: Record<string, any> = {}) {
  const record: any = {
    ...initial,
    merged: [] as any[],
    saveCalled: false,
    deleteCalled: false,
    merge(payload: Record<string, any>) {
      this.merged.push(payload)
      Object.assign(this, payload)
      return this
    },
    async save() {
      this.saveCalled = true
    },
    async delete() {
      this.deleteCalled = true
    },
    serialize() {
      return { ...initial, ...this }
    },
  }

  return record
}

function createFakeModel(hasDeletedAt: boolean) {
  return {
    $hasColumn(columnName: string) {
      return hasDeletedAt && columnName === 'deletedAt'
    },
    $getColumn(columnName: string) {
      if (hasDeletedAt && columnName === 'deletedAt') {
        return { columnName: 'deleted_at' }
      }
      return null
    },
    async create(payload: any) {
      return {
        id: 999,
        serialize: () => ({ id: 999, ...payload }),
      }
    },
  }
}

function createResponse() {
  const state: any = {
    jsonPayload: null,
    forbiddenPayload: null,
    notFoundPayload: null,
    badRequestPayload: null,
    redirectTo: null,
    sentBody: null,
    headers: {},
  }

  const response: any = {
    json(payload: any) {
      state.jsonPayload = payload
      return payload
    },
    forbidden(payload: any) {
      state.forbiddenPayload = payload
      return payload
    },
    notFound(payload: any) {
      state.notFoundPayload = payload
      return payload
    },
    badRequest(payload: any) {
      state.badRequestPayload = payload
      return payload
    },
    redirect(path?: string) {
      if (path) {
        state.redirectTo = path
        return path
      }
      return {
        back: () => {
          state.redirectTo = 'back'
          return 'back'
        },
      }
    },
    header(name: string, value: string) {
      state.headers[name] = value
      return response
    },
    send(payload: any) {
      state.sentBody = payload
      return payload
    },
  }

  return { response, state }
}

function createRequest(url: string, inputs: Record<string, any> = {}) {
  return {
    url: () => url,
    input: (key: string, fallback?: any) => (key in inputs ? inputs[key] : fallback),
    file: (key: string) => (inputs.__files ? inputs.__files[key] : null),
    validateUsing: async () => inputs,
  }
}

function createTableSchema() {
  return {
    columns: [{ name: 'id', label: 'ID' }],
    filters: [],
    actions: [],
    bulkActions: [],
    searchableColumns: ['id'],
    sortableColumns: ['id'],
    defaultSort: { column: 'id', direction: 'desc' },
    perPage: 10,
  }
}

function createResource(config: {
  slug?: string
  softDeletes?: boolean
  tableSchema?: Record<string, any>
  model?: any
  formFieldNames?: string[]
  scopedQuery: () => any
  canViewAny?: boolean
  canView?: boolean
  canCreate?: boolean
  canDelete?: boolean
}) {
  const slug = config.slug ?? 'fake-records'
  const tableSchema = config.tableSchema ?? createTableSchema()
  const model = config.model ?? createFakeModel(Boolean(config.softDeletes))
  const formFieldNames = config.formFieldNames ?? ['name']

  return {
    softDeletes: Boolean(config.softDeletes),
    tenantScoped: false,
    getSlug: () => slug,
    getNavigationLabel: () => 'Fake Records',
    getSingularLabel: () => 'Fake Record',
    getTableSchema: () => tableSchema,
    getForm: () => ({
      toJson: async () => ({
        sections: [
          {
            title: null,
            columns: 1,
            fields: formFieldNames.map((name) => ({
              type: 'text',
              name,
              label: name,
              required: false,
              nullable: true,
            })),
          },
        ],
      }),
      getFields: () => formFieldNames.map((name) => ({ getName: () => name })),
    }),
    getModel: () => model,
    scopedQuery: config.scopedQuery,
    canViewAny: async () => config.canViewAny ?? true,
    canView: async () => config.canView ?? true,
    canCreate: async () => config.canCreate ?? true,
    canUpdate: async () => true,
    canDelete: async () => config.canDelete ?? true,
    getPermissions: async () => ({
      canViewAny: config.canViewAny ?? true,
      canCreate: true,
      canUpdate: true,
      canDelete: config.canDelete ?? true,
    }),
  }
}

let panelCounter = 0
function registerPanelForResource(
  resource: any,
  options: {
    plugins?: Array<{
      getId: () => string
      register: (panel: Panel) => void
      onEvent?: (event: any) => any
    }>
    configurePanel?: (panel: Panel) => void
  } = {}
) {
  panelCounter += 1
  const panelId = `test-admin-${panelCounter}`
  const panelPath = `/test-admin-${panelCounter}`

  class TestPanel extends Panel {
    public id = panelId
    public path = panelPath
    public resources = [resource as any]
    public pages = []

    constructor() {
      super()

      for (const plugin of options.plugins || []) {
        this.plugin(plugin as any)
      }

      if (typeof options.configurePanel === 'function') {
        options.configurePanel(this)
      }
    }
  }

  filament.registerPanel(panelId, new TestPanel())

  return {
    panelPath,
    resourcePath: `${panelPath}/${resource.getSlug()}`,
  }
}

function createHttpContext(
  url: string,
  inputs: Record<string, any> = {},
  params: Record<string, any> = {}
) {
  const request = createRequest(url, inputs)
  const { response, state: responseState } = createResponse()
  const inertiaState: any = { view: null, props: null }
  const sessionStore = new Map<string, any>()
  const session = {
    get(key: string, fallback?: any) {
      return sessionStore.has(key) ? sessionStore.get(key) : fallback
    },
    put(key: string, value: any) {
      sessionStore.set(key, value)
    },
    forget(key: string) {
      sessionStore.delete(key)
    },
  }

  const ctx: any = {
    request,
    response,
    params,
    session,
    auth: {
      user: { id: 1, isAdmin: true },
    },
    inertia: {
      render(view: string, props: any) {
        inertiaState.view = view
        inertiaState.props = props
        return { view, props }
      },
    },
  }

  return { ctx, responseState, inertiaState, sessionStore }
}

test.group('AdminController', () => {
  test('index respects tenant scope from scopedQuery', async ({ assert }) => {
    const controller = new AdminController()
    const query = createFakeQuery({
      paginatedData: {
        data: [{ id: 1, name: 'Record A' }],
        meta: { currentPage: 1, perPage: 10, total: 1, lastPage: 1 },
      },
    })

    const resource = createResource({
      softDeletes: true,
      scopedQuery: () => {
        query.where('tenant_id', 42)
        return query
      },
    })

    const { resourcePath } = registerPanelForResource(resource)
    const { ctx, inertiaState } = createHttpContext(resourcePath, { trashed: 'without' })

    await controller.index(ctx)

    assert.deepInclude(query.__state.whereCalls, ['tenant_id', 42])
    assert.include(query.__state.whereNullCalls, 'deleted_at')
    assert.equal(inertiaState.view, 'admin/resource/index')
  })

  test('index triggers plugin hooks/events and allows render prop mutation', async ({ assert }) => {
    const controller = new AdminController()
    const query = createFakeQuery({
      paginatedData: {
        data: [{ id: 1, name: 'Record A' }],
        meta: { currentPage: 1, perPage: 10, total: 1, lastPage: 1 },
      },
    })
    const eventNames: string[] = []

    const resource = createResource({
      softDeletes: true,
      scopedQuery: () => query,
    })

    const eventPlugin = {
      getId: () => 'event-test-plugin',
      register: (_panel: Panel) => {},
      onEvent: (event: any) => {
        eventNames.push(event.name)
        if (event.name === 'render.before') {
          event.payload.props.__pluginInjected = true
        }
      },
    }

    const { resourcePath } = registerPanelForResource(resource, {
      plugins: [eventPlugin],
    })

    const { ctx, inertiaState } = createHttpContext(resourcePath, { trashed: 'without' })
    await controller.index(ctx)

    assert.equal(inertiaState.view, 'admin/resource/index')
    assert.equal(inertiaState.props?.__pluginInjected, true)
    for (const expectedEvent of [
      'resource.index.before',
      'auth.resource.viewAny.before',
      'auth.resource.viewAny.allowed',
      'resource.index.after',
      'render.before',
      'render.after',
    ]) {
      assert.isTrue(eventNames.includes(expectedEvent))
    }
  })

  test('blocks bulk actions when user lacks delete permission', async ({ assert }) => {
    const controller = new AdminController()
    const query = createFakeQuery()

    const resource = createResource({
      softDeletes: false,
      scopedQuery: () => query,
      canDelete: false,
    })

    const { resourcePath } = registerPanelForResource(resource)
    const { ctx, responseState } = createHttpContext(resourcePath + '/bulk', { ids: [1, 2] })

    await controller.bulkDestroy(ctx)

    assert.equal(responseState.forbiddenPayload?.message, 'Unauthorized access')
  })

  test('export CSV applies search, filters, preload, and trashed scope', async ({ assert }) => {
    const controller = new AdminController()
    const query = createFakeQuery({
      records: [
        {
          serialize: () => ({
            id: 1,
            name: 'Alice',
            user: { email: 'alice@example.com' },
            isActive: true,
          }),
        },
      ],
    })

    const resource = createResource({
      softDeletes: true,
      scopedQuery: () => query,
      tableSchema: {
        ...createTableSchema(),
        columns: [
          { name: 'name', label: 'Name' },
          { name: 'user.email', label: 'Email' },
        ],
        searchableColumns: ['name'],
      },
    })

    const { resourcePath } = registerPanelForResource(resource)
    const { ctx, responseState } = createHttpContext(
      `${resourcePath}/export/csv`,
      {
        search: 'Ali',
        filters: { isActive: 'true' },
        trashed: 'only',
      },
      { format: 'csv' }
    )

    await controller.export(ctx)

    assert.include(query.__state.preloadCalls, 'user')
    assert.include(query.__state.whereNotNullCalls, 'deleted_at')
    assert.deepInclude(query.__state.whereLikeCalls, ['name', '%Ali%'])
    assert.deepInclude(query.__state.whereCalls, ['isActive', 1])
    assert.equal(responseState.headers['Content-Type'], 'text/csv')
    assert.include(responseState.sentBody, 'Name,Email')
    assert.include(responseState.sentBody, 'alice@example.com')
  })

  test('import CSV creates records and coerces boolean values', async ({ assert }) => {
    const controller = new AdminController()
    const createdPayloads: any[] = []

    const resource = createResource({
      scopedQuery: () => createFakeQuery(),
      formFieldNames: ['fullName', 'email', 'isAdmin'],
      model: {
        ...createFakeModel(false),
        async create(payload: any) {
          createdPayloads.push(payload)
          return {
            id: createdPayloads.length,
            serialize: () => ({ id: createdPayloads.length, ...payload }),
          }
        },
      },
    })

    const { resourcePath } = registerPanelForResource(resource)
    const { ctx, responseState } = createHttpContext(`${resourcePath}/import`, {
      content: 'full_name,email,is_admin\nAlice,alice@example.com,true\nBob,bob@example.com,false',
    })

    await controller.import(ctx)

    assert.equal(responseState.jsonPayload?.success, true)
    assert.equal(responseState.jsonPayload?.importedCount, 2)
    assert.equal(responseState.jsonPayload?.skippedCount, 0)
    assert.equal(createdPayloads[0].fullName, 'Alice')
    assert.equal(createdPayloads[0].isAdmin, true)
    assert.equal(createdPayloads[1].isAdmin, false)
  })

  test('import denies the request when user cannot create', async ({ assert }) => {
    const controller = new AdminController()

    const resource = createResource({
      scopedQuery: () => createFakeQuery(),
      canCreate: false,
      formFieldNames: ['name'],
    })

    const { resourcePath } = registerPanelForResource(resource)
    const { ctx, responseState } = createHttpContext(`${resourcePath}/import`, {
      content: 'name\nAlice',
    })

    await controller.import(ctx)

    assert.equal(responseState.forbiddenPayload?.message, 'Unauthorized access')
  })

  test('switchTenant stores tenant in session for an admin', async ({ assert }) => {
    const controller = new AdminController()
    const { ctx, responseState, sessionStore } = createHttpContext('/admin/tenancy/switch', {
      tenantId: 2,
    })
    ;(ctx as any).availableTenants = [
      {
        id: 2,
        name: 'Acme',
        slug: 'acme',
        status: 'active',
      },
    ]

    await controller.switchTenant(ctx)

    assert.equal(responseState.jsonPayload?.success, true)
    assert.equal(sessionStore.get('filament.current_tenant_id'), 2)
  })

  test('switchTenant rejects out-of-scope tenant for non-admin user', async ({ assert }) => {
    const controller = new AdminController()
    const { ctx, responseState } = createHttpContext('/admin/tenancy/switch', { tenantId: 2 })
    ;(ctx as any).availableTenants = [
      {
        id: 2,
        name: 'Other',
        slug: 'other',
        status: 'active',
      },
    ]
    ctx.auth.user = { id: 9, isAdmin: false, tenantId: 1 }

    await controller.switchTenant(ctx)

    assert.equal(responseState.forbiddenPayload?.message, 'Unauthorized access for this tenant')
  })

  test('clearTenant removes forced tenant from session', async ({ assert }) => {
    const controller = new AdminController()
    const { ctx, responseState, sessionStore } = createHttpContext('/admin/tenancy/clear')

    sessionStore.set('filament.current_tenant_id', 3)
    await controller.clearTenant(ctx)

    assert.equal(responseState.jsonPayload?.success, true)
    assert.isFalse(sessionStore.has('filament.current_tenant_id'))
  })

  test('setupMfa + confirmMfa enable MFA and generate recovery codes', async ({ assert }) => {
    const controller = new AdminController()
    const user: any = {
      id: 1,
      email: 'demo@example.com',
      twoFactorSecret: null,
      twoFactorRecoveryCodes: null,
      twoFactorConfirmedAt: null,
      saveCalled: false,
      async save() {
        this.saveCalled = true
      },
    }

    const setupCtx = createHttpContext('/admin/security/mfa/setup')
    setupCtx.ctx.auth.user = user
    await controller.setupMfa(setupCtx.ctx)

    const pendingSecret = setupCtx.sessionStore.get('filament.mfa.pending_secret')
    assert.isString(pendingSecret)
    assert.equal(setupCtx.responseState.jsonPayload?.success, true)

    const token = generateTotpToken({ secret: pendingSecret })
    const confirmCtx = createHttpContext('/admin/security/mfa/confirm', { code: token })
    confirmCtx.ctx.auth.user = user
    confirmCtx.sessionStore.set('filament.mfa.pending_secret', pendingSecret)

    await controller.confirmMfa(confirmCtx.ctx)

    assert.equal(confirmCtx.responseState.jsonPayload?.success, true)
    assert.isArray(confirmCtx.responseState.jsonPayload?.recoveryCodes)
    assert.isTrue(user.saveCalled)
    assert.isString(user.twoFactorSecret)
    assert.isString(user.twoFactorRecoveryCodes)
    assert.isDefined(user.twoFactorConfirmedAt)
  })

  test('bulkDestroy with trashed=only performs force delete', async ({ assert }) => {
    const controller = new AdminController()
    const forceQuery = createFakeQuery({ deleteCount: 2 })

    const resource = createResource({
      softDeletes: true,
      scopedQuery: () => forceQuery,
    })

    const { resourcePath } = registerPanelForResource(resource)
    const { ctx, responseState } = createHttpContext(`${resourcePath}/bulk`, {
      ids: [10, 11],
      trashed: 'only',
    })

    await controller.bulkDestroy(ctx)

    assert.include(forceQuery.__state.whereNotNullCalls, 'deleted_at')
    assert.isTrue(forceQuery.__state.deleteCalled)
    assert.equal(forceQuery.__state.updatePayloads.length, 0)
    assert.equal(responseState.jsonPayload?.mode, 'force')
    assert.equal(responseState.jsonPayload?.deletedCount, 2)
  })

  test('show returns the detail page and includes soft-deleted records', async ({ assert }) => {
    const controller = new AdminController()
    const record = createFakeRecord({
      id: 7,
      name: 'Record X',
      deletedAt: new Date().toISOString(),
      tags: [{ id: 4, name: 'tag-a' }],
    })
    const query = createFakeQuery()
    query.firstOrFail = async () => record

    const resource = createResource({
      softDeletes: true,
      scopedQuery: () => query,
      model: {
        ...createFakeModel(true),
        name: 'Post',
      },
    })

    const { resourcePath } = registerPanelForResource(resource)
    const { ctx, inertiaState } = createHttpContext(`${resourcePath}/7`, {}, { id: '7' })

    await controller.show(ctx)

    assert.deepInclude(query.__state.whereCalls, ['id', 7])
    assert.equal(inertiaState.view, 'admin/resource/view')
    assert.equal(inertiaState.props?.record?.id, 7)
    assert.deepEqual(inertiaState.props?.record?.tags, [4])
  })

  test('show denies access when view permission is missing', async ({ assert }) => {
    const controller = new AdminController()
    const query = createFakeQuery()

    const resource = createResource({
      softDeletes: false,
      scopedQuery: () => query,
      canView: false,
    })

    const { resourcePath } = registerPanelForResource(resource)
    const { ctx, inertiaState } = createHttpContext(`${resourcePath}/42`, {}, { id: '42' })

    await controller.show(ctx)

    assert.equal(inertiaState.view, 'errors/forbidden')
  })

  test('destroy/restore/forceDestroy handle soft-delete lifecycle correctly', async ({
    assert,
  }) => {
    const controller = new AdminController()

    const recordToDelete = createFakeRecord({ id: 1, deletedAt: null })
    const deleteQuery = createFakeQuery()
    deleteQuery.firstOrFail = async () => recordToDelete

    const recordToRestore = createFakeRecord({ id: 1, deletedAt: new Date().toISOString() })
    const restoreQuery = createFakeQuery()
    restoreQuery.firstOrFail = async () => recordToRestore

    const recordToForceDelete = createFakeRecord({ id: 1, deletedAt: new Date().toISOString() })
    const forceDeleteQuery = createFakeQuery()
    forceDeleteQuery.firstOrFail = async () => recordToForceDelete

    const queries = [deleteQuery, restoreQuery, forceDeleteQuery]
    const resource = createResource({
      softDeletes: true,
      scopedQuery: () => {
        const nextQuery = queries.shift()
        if (!nextQuery) throw new Error('No query prepared')
        return nextQuery
      },
    })

    const { resourcePath } = registerPanelForResource(resource)

    const destroyCtx = createHttpContext(`${resourcePath}/1`, {}, { id: '1' })
    await controller.destroy(destroyCtx.ctx)
    assert.isTrue(recordToDelete.saveCalled)
    assert.isTrue(recordToDelete.merged.some((payload: any) => payload.deletedAt))

    const restoreCtx = createHttpContext(`${resourcePath}/1/restore`, {}, { id: '1' })
    await controller.restore(restoreCtx.ctx)
    assert.isTrue(recordToRestore.saveCalled)
    assert.deepInclude(recordToRestore.merged, { deletedAt: null })

    const forceCtx = createHttpContext(`${resourcePath}/1/force`, {}, { id: '1' })
    await controller.forceDestroy(forceCtx.ctx)
    assert.isTrue(recordToForceDelete.deleteCalled)
  })
})
