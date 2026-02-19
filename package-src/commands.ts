const commandEntries = [
  {
    commandName: 'make:filament-resource',
    filePath: '../commands/MakeFilamentResource.js',
  },
  {
    commandName: 'make:filament-panel',
    filePath: '../commands/MakeFilamentPanel.js',
  },
  {
    commandName: 'make:filament-plugin',
    filePath: '../commands/MakeFilamentPlugin.js',
  },
  {
    commandName: 'filament:plugin:publish',
    filePath: '../commands/PublishFilamentPlugins.js',
  },
] as const

export async function getMetaData() {
  return Promise.all(
    commandEntries.map(async (entry) => {
      const module = await import(new URL(entry.filePath, import.meta.url).href)
      return {
        ...module.default.serialize(),
        filePath: entry.filePath,
      }
    })
  )
}

export async function getCommand(metaData: { commandName: string }) {
  const command = commandEntries.find((entry) => entry.commandName === metaData.commandName)
  if (!command) {
    return null
  }

  const module = await import(new URL(command.filePath, import.meta.url).href)
  return module.default
}
