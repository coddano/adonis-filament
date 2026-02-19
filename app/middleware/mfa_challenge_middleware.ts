import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import filament from '#filament/Core/FilamentManager'

export default class MfaChallengeMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user as any
    if (!user) {
      return next()
    }

    const hasMfaEnabled = Boolean(user.twoFactorSecret && user.twoFactorConfirmedAt)
    if (!hasMfaEnabled) {
      return next()
    }

    const panel = filament.getCurrentPanel(ctx.request.url())
    if (!panel) {
      return next()
    }

    const currentPath = ctx.request.url()
    const challengePath = `${panel.path}/mfa/challenge`
    const isChallengeRoute = currentPath.startsWith(challengePath)

    if (isChallengeRoute) {
      return next()
    }

    const verifiedUserId = Number(ctx.session.get('filament.mfa.verified_user_id') || 0)
    if (verifiedUserId === Number(user.id)) {
      return next()
    }

    if (ctx.request.ajax() || ctx.request.header('X-Requested-With') === 'XMLHttpRequest') {
      return ctx.response.status(423).json({
        message: 'Validation MFA requise',
        challengeUrl: challengePath,
      })
    }

    return ctx.response.redirect(challengePath)
  }
}
