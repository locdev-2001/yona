// Port từ shared/helpers/sanitizeData.js
export const labelSanitizePattern = /[^a-zA-Z0-9_-]/g;
export const spacesPattern = /\s+/g;

export const sanitizeLabel = (label = ''): string => {
    if (!label) return '';

    return label.trim().toLowerCase().replace(spacesPattern, '-').replace(labelSanitizePattern, '');
};
