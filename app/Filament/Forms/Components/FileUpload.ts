import vine from '@vinejs/vine'
import { Field } from '../Field.js'

export class FileUpload extends Field {
  protected _acceptedFileTypes: string[] = ['image/*']
  protected _maxSize: string = '2mb'
  protected _directory: string = 'uploads'
  protected _disk: string = 'public' // local, s3, etc. (currently handling local public storage)
  protected _multiple: boolean = false

  getType(): string {
    return 'file-upload'
  }

  directory(directory: string): this {
    this._directory = directory
    return this
  }

  disk(disk: string): this {
    this._disk = disk
    return this
  }

  acceptedFileTypes(types: string[]): this {
    this._acceptedFileTypes = types
    return this
  }

  maxSize(size: string): this {
    this._maxSize = size
    return this
  }

  image(): this {
    this._acceptedFileTypes = ['jpg', 'jpeg', 'png', 'webp', 'gif']
    return this
  }

  public toVine() {
    // Validation fichier
    let schema = vine.file({
      size: this._maxSize,
      extnames: this._acceptedFileTypes
        .map((t) => t.replace('image/', ''))
        .filter((t) => t !== '*'),
    })

    return this._required ? schema : schema.optional()
  }

  async toJson(): Promise<Record<string, any>> {
    return {
      ...(await super.toJson()),
      acceptedFileTypes: this._acceptedFileTypes,
      maxSize: this._maxSize,
      directory: this._directory,
      disk: this._disk,
      multiple: this._multiple,
    }
  }
}
