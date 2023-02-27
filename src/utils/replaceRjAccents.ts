export function replaceRjAccents(str: string) {
    const stringToReplace: {[x: string]: string} = {
        'Infra��es': 'Infrações',
        'N�O': 'NÃO',
        '�ltimos': 'Últimos',
        'Autua��o': 'Autuações',
        'Pontu�veis': 'Pontuáveis',
        'Mandat�rias': 'Mandatórias',
        'Suspens�o': 'Suspensão',
        'Cassa��o': 'Cassação',
    }

    const regex = new RegExp(Object.keys(stringToReplace).join('|'), 'g')
    const newStr = str.replaceAll(regex, matched => stringToReplace[matched])

    return newStr
}