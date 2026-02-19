import { Resource } from '#filament/Core/Resource'
import Product from '#models/product'
import { Form } from '#filament/Forms/Form'
import { Table } from '#filament/Tables/Table'

export default class ProductResource extends Resource {
  public static model = Product
  public static slug = 'products'
  public static navigationIcon = 'shopping-bag'
  public static navigationLabel = 'Products'
  public static singularLabel = 'Product'

  public static form(form: Form): Form {
    return form.schema([
      // Ajouter les champs ici
    ])
  }

  public static table(table: Table): Table {
    return table
      .columns([
        // Ajouter les colonnes ici
      ])
      .actions([
        // EditAction.make(),
        // DeleteAction.make(),
      ])
      .bulkActions([
        // BulkDeleteAction.make(),
      ])
      .defaultSort('createdAt', 'desc')
  }
}
