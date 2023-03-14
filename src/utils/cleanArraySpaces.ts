export function cleanArraySpaces(arr: string[]) {
    return arr.map(text => text.trim()).filter(text => text.replace(/(\r\n|\n|\r)/gm, "") !== '')
}