/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import filament from '#filament/Core/FilamentManager'

router.get('/', async ({ inertia }) => {
  return inertia.render('home')
})

filament.routes(router)
