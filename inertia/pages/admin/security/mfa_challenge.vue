<script setup lang="ts">
import { ref } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  panelPath: string
  sessionMfaVerified: boolean
}>()

const toast = useToast()
const code = ref('')
const recoveryCode = ref('')
const processing = ref(false)

async function submit() {
  if (!code.value.trim() && !recoveryCode.value.trim()) {
    toast.error('Code required', 'Enter an MFA code or a recovery code.')
    return
  }

  processing.value = true
  try {
    const res = await fetch(`${props.panelPath}/mfa/challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        code: code.value,
        recoveryCode: recoveryCode.value,
      }),
    })
    const payload = await res.json()
    if (!res.ok || !payload?.success) {
      throw new Error(payload?.message || 'Invalid MFA code')
    }

    toast.success('MFA verification successful')
    router.visit(props.panelPath)
  } catch (error: any) {
    toast.error('Error', error?.message || 'Unable to verify MFA code')
  } finally {
    processing.value = false
  }
}
</script>

<template>
  <Head title="MFA Verification" />

  <div class="min-h-screen flex items-center justify-center bg-muted/40 p-6">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle>MFA Verification</CardTitle>
        <CardDescription>
          Enter a code from your authenticator app to access the panel.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <Label for="mfa-code">MFA code</Label>
          <Input id="mfa-code" v-model="code" placeholder="123456" />
        </div>

        <div class="space-y-2">
          <Label for="mfa-recovery">Recovery code (optional)</Label>
          <Input id="mfa-recovery" v-model="recoveryCode" placeholder="ABCDE-12345" />
        </div>

        <Button class="w-full" :disabled="processing" @click="submit"> Verify </Button>
      </CardContent>
    </Card>
  </div>
</template>
