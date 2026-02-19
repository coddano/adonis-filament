import { defineConfig } from '@adonisjs/inertia'
import type { InferSharedProps } from '@adonisjs/inertia/types'
import filament from '#filament/Core/FilamentManager'
import type { NavigationGroup } from '#filament/Core/FilamentManager'

const inertiaConfig = defineConfig({
  /**
   * Path to the Edge view that will be used as the root view for Inertia responses
   */
  rootView: 'inertia_layout',

  /**
   * Data that should be shared with all rendered pages
   */
  sharedData: {
    auth: (ctx) =>
      ctx.inertia.always(() => ({
        user: ctx.auth?.user ?? null,
      })),
    filament: (ctx) =>
      ctx.inertia.always(() => {
        const currentPath = ctx.request.url() || '/'
        return filament.getSharedData(currentPath).filament
      }),
  },

  /**
   * Options for the server-side rendering
   */
  ssr: {
    enabled: true,
    entrypoint: 'inertia/app/ssr.ts',
  },
})

export default inertiaConfig

declare module '@adonisjs/inertia/types' {
  export interface SharedProps extends InferSharedProps<typeof inertiaConfig> {
    filament: {
      currentPanel: { id: string; path: string } | null
      navigation: NavigationGroup[]
      panels: Array<{ id: string; path: string }>
      tenant: { id: number; name: string; slug: string; domain: string | null } | null
      tenancy: {
        current: { id: number; name: string; slug: string; domain: string | null } | null
        available: Array<{
          id: number
          name: string
          slug: string
          domain: string | null
          status: string
        }>
      }
    }
  }
}
