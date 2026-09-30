export function isPublicRegistrationEnabled(
  value: string | undefined = process.env.ALLOW_PUBLIC_REGISTRATION,
): boolean {
  return value === "true";
}

/** Existing users can sign in with OAuth while new accounts stay closed. */
export function canOAuthSignIn(registrationEnabled: boolean, existingUser: boolean): boolean {
  return registrationEnabled || existingUser;
}
