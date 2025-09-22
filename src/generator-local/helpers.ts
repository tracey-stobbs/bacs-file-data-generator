export function generateFileName(baseName: string, fileType: string): string {
    return `${baseName}.${fileType}`;
}

export function formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return date.toLocaleDateString(undefined, options).replace(/\//g, '-');
}

export function validateFilePath(filePath: string): boolean {
    // Basic validation for file path (can be expanded as needed)
    return typeof filePath === 'string' && filePath.length > 0;
}