/**
 * Utility functions for Admin role detection and authorization
 */

export function getAdminEmails(): string[] {
  const envAdmin = (import.meta.env.VITE_ADMIN_EMAIL as string) || '';
  return envAdmin
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Checks if a given email is authorized for Admin Dashboard access
 */
export function isAdminUser(email?: string | null): boolean {
  if (!email) return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.trim().toLowerCase());
}
