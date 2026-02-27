/**
 * Sanitizes a name string for use in filenames.
 * Removes special characters and replaces spaces with hyphens.
 *
 * @param name - The name to sanitize
 * @returns Sanitized name safe for use in filenames
 *
 * @example
 * sanitizeName('ACME Ltd') // returns 'ACME-Ltd'
 * sanitizeName('Tech Corp & Co.') // returns 'Tech-Corp-Co'
 */
export function sanitizeName(name: string): string {
  return name
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-zA-Z0-9-_]/g, '') // Remove special characters except hyphens and underscores
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}
