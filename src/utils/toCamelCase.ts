export function toCamelCase(str: string) {
    return str
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\u00C0-\u00FF]+(.)/g, (_m: any, chr: string) => chr.toUpperCase());
}
