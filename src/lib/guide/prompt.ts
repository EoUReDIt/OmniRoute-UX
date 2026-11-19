import { oidcClientSecretConfigured } from '@/lib/settings/configured'
import { entraGraphClientSecretConfigured } from '@/lib/settings/entra-configured'

/**
 * Builds guide prompt with boolean flags ONLY
 * 
 * @param hasOidcClientSecret - Whether OIDC client secret exists
 * @param oidcClientSecretConfigured - Boolean flag (true/false), NOT the raw secret
 * @param hasEntraGraphClientSecret - Whether Entra ID client secret exists
 * @param entraGraphClientSecretConfigured - Boolean flag (true/false), NOT the raw secret
 * @returns Guide prompt string with boolean flag status only
 * 
 * 🔒 Security: Never includes raw secret values in output.
 * Boolean flags directly map to /api/settings secret redaction implementation.
 */
export function buildGuidePrompt(
  hasOidcClientSecret: boolean,
  oidcClientSecretConfigured: boolean,
  hasEntraGraphClientSecret: boolean,
  entraGraphClientSecretConfigured: boolean
): string {
  const promptParts: string[] = []

  // OIDC section - boolean flags only
  if (hasOidcClientSecret) {
    promptParts.push(
      `oidcClientSecretConfigured: ${oidcClientSecretConfigured}`
    )
  }

  // Entra ID section - boolean flags only
  if (hasEntraGraphClientSecret) {
    promptParts.push(
      `entraGraphClientSecretConfigured: ${entraGraphClientSecretConfigured}`
    )
  }

  // Never include raw secret values
  // oidcClientSecret and entraGraphClientSecret are NEVER embedded in prompt

  return promptParts.join('\n')
}

/**
 * Default build with boolean flags only
 */
export function buildGuidePromptDefault(
  hasOidcClientSecret: boolean = false,
  oidcClientSecretConfigured: boolean = false,
  hasEntraGraphClientSecret: boolean = false,
  entraGraphClientSecretConfigured: boolean = false
): string {
  return buildGuidePrompt(
    hasOidcClientSecret,
    oidcClientSecretConfigured,
    hasEntraGraphClientSecret,
    entraGraphClientSecretConfigured
  )
}

export default buildGuidePrompt