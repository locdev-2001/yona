/**
 * Convert a PascalCase module name to kebab-case directory name.
 *
 * Examples:
 *   Sample      → sample
 *   CrmSales    → crm-sales
 *   Announcements → announcements
 *   Identity    → identity
 *   MultiWordX  → multi-word-x
 *
 * Rule: insert hyphen before each uppercase letter that follows a
 * lowercase letter or digit, then lowercase the whole string.
 * This produces NO leading hyphen (correct for directory names like
 * modules/crm-sales, modules/sample).
 */
export function moduleToKebab(module: string): string {
    return module.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
