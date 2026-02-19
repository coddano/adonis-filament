/**
 * Action - Class to define table actions
 */
export abstract class Action {
  protected _name: string
  protected _label: string | null = null
  protected _icon: string | null = null
  protected _color: 'primary' | 'danger' | 'warning' | 'success' | 'secondary' = 'primary'
  protected _requiresConfirmation: boolean = false
  protected _confirmationTitle: string = 'Confirm action'
  protected _confirmationMessage: string = 'Are you sure you want to perform this action?'
  protected _url: string | null = null
  protected _method: 'get' | 'post' | 'put' | 'delete' = 'post'

  constructor(name: string) {
    this._name = name
  }

  label(label: string): this {
    this._label = label
    return this
  }

  icon(icon: string): this {
    this._icon = icon
    return this
  }

  color(color: 'primary' | 'danger' | 'warning' | 'success' | 'secondary'): this {
    this._color = color
    return this
  }

  requiresConfirmation(requires: boolean = true, title?: string, message?: string): this {
    this._requiresConfirmation = requires
    if (title) this._confirmationTitle = title
    if (message) this._confirmationMessage = message
    return this
  }

  url(url: string): this {
    this._url = url
    return this
  }

  method(method: 'get' | 'post' | 'put' | 'delete'): this {
    this._method = method
    return this
  }

  abstract getType(): string

  getName(): string {
    return this._name
  }

  toJson(): Record<string, any> {
    return {
      type: this.getType(),
      name: this._name,
      label: this._label || this.formatLabel(),
      icon: this._icon,
      color: this._color,
      requiresConfirmation: this._requiresConfirmation,
      confirmationTitle: this._confirmationTitle,
      confirmationMessage: this._confirmationMessage,
      url: this._url,
      method: this._method,
    }
  }

  protected formatLabel(): string {
    return this._name
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  }
}

/**
 * ViewAction - Action pour voir un enregistrement
 */
export class ViewAction extends Action {
  getType(): string {
    return 'view'
  }

  constructor(name: string = 'view') {
    super(name)
    this._label = 'View'
    this._icon = 'eye'
    this._method = 'get'
  }

  static make(name: string = 'view'): ViewAction {
    return new ViewAction(name)
  }
}

/**
 * EditAction - Action to edit a record
 */
export class EditAction extends Action {
  getType(): string {
    return 'edit'
  }

  constructor(name: string = 'edit') {
    super(name)
    this._label = 'Edit'
    this._icon = 'pencil'
    this._method = 'get'
  }

  static make(name: string = 'edit'): EditAction {
    return new EditAction(name)
  }
}

/**
 * DeleteAction - Action pour supprimer un enregistrement
 */
export class DeleteAction extends Action {
  getType(): string {
    return 'delete'
  }

  constructor(name: string = 'delete') {
    super(name)
    this._label = 'Delete'
    this._icon = 'trash'
    this._color = 'danger'
    this._method = 'delete'
    this._requiresConfirmation = true
    this._confirmationTitle = 'Delete this item?'
    this._confirmationMessage = 'This action is irreversible.'
  }

  static make(name: string = 'delete'): DeleteAction {
    return new DeleteAction(name)
  }
}

/**
 * RestoreAction - Action to restore a deleted record
 */
export class RestoreAction extends Action {
  getType(): string {
    return 'restore'
  }

  constructor(name: string = 'restore') {
    super(name)
    this._label = 'Restore'
    this._icon = 'rotate-ccw'
    this._color = 'success'
    this._method = 'post'
    this._requiresConfirmation = true
    this._confirmationTitle = 'Restore this item?'
    this._confirmationMessage = 'The record will be active again.'
  }

  static make(name: string = 'restore'): RestoreAction {
    return new RestoreAction(name)
  }
}

/**
 * ForceDeleteAction - Action to permanently delete a record
 */
export class ForceDeleteAction extends Action {
  getType(): string {
    return 'force-delete'
  }

  constructor(name: string = 'force-delete') {
    super(name)
    this._label = 'Delete permanently'
    this._icon = 'trash'
    this._color = 'danger'
    this._method = 'delete'
    this._requiresConfirmation = true
    this._confirmationTitle = 'Delete permanently?'
    this._confirmationMessage = 'This action is irreversible and permanently removes data.'
  }

  static make(name: string = 'force-delete'): ForceDeleteAction {
    return new ForceDeleteAction(name)
  }
}

/**
 * CloneAction - Action pour dupliquer un enregistrement
 */
export class CloneAction extends Action {
  getType(): string {
    return 'clone'
  }

  constructor(name: string = 'clone') {
    super(name)
    this._label = 'Duplicate'
    this._icon = 'copy'
    this._color = 'secondary'
    this._method = 'post'
  }

  static make(name: string = 'clone'): CloneAction {
    return new CloneAction(name)
  }
}

/**
 * BulkDeleteAction - Bulk action to delete multiple records
 */
export class BulkDeleteAction extends Action {
  getType(): string {
    return 'bulk-delete'
  }

  constructor(name: string = 'bulk-delete') {
    super(name)
    this._label = 'Delete selected'
    this._icon = 'trash'
    this._color = 'danger'
    this._method = 'delete'
    this._requiresConfirmation = true
    this._confirmationTitle = 'Delete selected items?'
    this._confirmationMessage = 'This action is irreversible.'
  }

  static make(name: string = 'bulk-delete'): BulkDeleteAction {
    return new BulkDeleteAction(name)
  }
}

/**
 * ExportAction - Action to export data
 */
export class ExportAction extends Action {
  protected _formats: ('csv' | 'xlsx' | 'pdf')[] = ['csv', 'xlsx']

  getType(): string {
    return 'export'
  }

  constructor(name: string = 'export') {
    super(name)
    this._label = 'Export'
    this._icon = 'download'
    this._color = 'secondary'
  }

  static make(name: string = 'export'): ExportAction {
    return new ExportAction(name)
  }

  formats(formats: ('csv' | 'xlsx' | 'pdf')[]): this {
    this._formats = formats
    return this
  }

  toJson(): Record<string, any> {
    return {
      ...super.toJson(),
      formats: this._formats,
    }
  }
}

/**
 * ImportAction - Action to import data via CSV file
 */
export class ImportAction extends Action {
  protected _acceptedExtensions: string[] = ['csv']
  protected _maxRows: number = 1000

  getType(): string {
    return 'import'
  }

  constructor(name: string = 'import') {
    super(name)
    this._label = 'Import'
    this._icon = 'upload'
    this._color = 'secondary'
    this._method = 'post'
  }

  static make(name: string = 'import'): ImportAction {
    return new ImportAction(name)
  }

  acceptedExtensions(extensions: string[]): this {
    this._acceptedExtensions = extensions
    return this
  }

  maxRows(maxRows: number): this {
    this._maxRows = maxRows
    return this
  }

  toJson(): Record<string, any> {
    return {
      ...super.toJson(),
      acceptedExtensions: this._acceptedExtensions,
      maxRows: this._maxRows,
    }
  }
}
