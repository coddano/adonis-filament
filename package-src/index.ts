import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import Configure from '@adonisjs/core/commands/configure'

function resolvePackageRoot(): string {
  const candidateRoots = [
    fileURLToPath(new URL('../', import.meta.url)),
    fileURLToPath(new URL('../../', import.meta.url)),
  ]

  for (const root of candidateRoots) {
    if (existsSync(`${root}/stubs/install/provider.stub`)) {
      return root
    }
  }

  return candidateRoots[0]
}

export const stubsRoot = resolvePackageRoot()

async function ensurePackageImports(command: Configure) {
  const packageJsonPath = command.app.makePath('package.json')
  const packageJsonRaw = await readFile(packageJsonPath, 'utf-8')
  const packageJson = JSON.parse(packageJsonRaw)

  const imports = packageJson.imports || {}
  let hasChanged = false

  if (imports['#filament/*'] !== 'adonis-admin-engine/Filament/*') {
    imports['#filament/*'] = 'adonis-admin-engine/Filament/*'
    hasChanged = true
  }

  if (imports['#admin/*'] !== './app/Admin/*.js') {
    imports['#admin/*'] = './app/Admin/*.js'
    hasChanged = true
  }

  if (hasChanged) {
    packageJson.imports = imports
    await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
    command.logger.action('update package.json imports').succeeded()
  }
}

async function ensureRoutesRegistered(command: Configure) {
  const routesFilePath = command.app.makePath('start/routes.ts')
  let content = await readFile(routesFilePath, 'utf-8')
  let hasChanged = false

  if (!content.includes("from '#filament/Core/FilamentManager'")) {
    const routerImport = /import\s+router\s+from\s+['"]@adonisjs\/core\/services\/router['"];?\n/
    if (routerImport.test(content)) {
      content = content.replace(
        routerImport,
        (line) => `${line}import filament from '#filament/Core/FilamentManager'\n`
      )
    } else {
      content = `import filament from '#filament/Core/FilamentManager'\n${content}`
    }
    hasChanged = true
  }

  if (!content.includes('filament.routes(router)')) {
    content = `${content.trimEnd()}\n\nfilament.routes(router)\n`
    hasChanged = true
  }

  if (hasChanged) {
    await writeFile(routesFilePath, content)
    command.logger.action('update start/routes.ts').succeeded()
  }
}

/**
 * Configure the package inside an AdonisJS application.
 */
export async function configure(command: Configure) {
  const codemods = await command.createCodemods()

  await codemods.makeUsingStub(stubsRoot, 'stubs/install/provider.stub', {})
  await codemods.makeUsingStub(stubsRoot, 'stubs/install/admin_panel.stub', {})

  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('#providers/filament_provider')
    rcFile.addCommand('adonis-admin-engine/commands')
  })

  await ensurePackageImports(command)
  await ensureRoutesRegistered(command)

  command.logger.success('Adonis Admin Engine configured successfully')
  command.logger.info('Next steps:')
  command.logger.info('  1. Run `node ace make:filament-resource <Model> --generate`')
  command.logger.info('  2. Run `node ace make:filament-plugin Audit --resource` (optional)')
  command.logger.info('  3. Register resources in app/Admin/Panels/AdminPanel.ts')
  command.logger.info('  4. Visit /admin')
}
