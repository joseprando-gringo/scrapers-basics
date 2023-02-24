import { RequestHandler } from 'express';
import axios from 'axios';
import { Cookie } from 'tough-cookie';
import { load } from 'cheerio';
import { toCamelCase } from '../utils/toCamelCase';
import { cleanArraySpaces } from '../utils/cleanArraySpaces';

export const mgCnhHandler: RequestHandler = async (req, res) => {
    const { cpf, dataNascimento, dataPrimeiraHabilitacao } = req.body;

    // 1. GET na pagina principal
    console.log('1. GET na pagina principal');

    const firstPageResponse = await axios.get('https://www.detran.mg.gov.br/habilitacao/prontuario/consultar-pontuacao-cnh', {
        headers: {
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'pt-BR,pt;q=0.9',
            'Cache-Control': 'max-age=0',
            Connection: 'keep-alive',
            Host: 'www.detran.mg.gov.br',
            'sec-ch-ua': '"Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        }
    });

    // 2. Capturar Cookie (Set-Cookie)
    console.log('2. Capturar Cookie (Set-Cookie)');

    const cookiesString = (firstPageResponse.headers['set-cookie'] ?? [])
    .map(cookieStr => Cookie.parse(cookieStr))
    .map(cookie => cookie?.cookieString())
    .join('; ')
    .trim();  

    const csrfToken = cookiesString.split(';').find(cookie => cookie.includes('csrfToken'))?.split('=')[1] ?? '';

      // 3. Capturar os Input Hidden
  console.log('3. Capturar os Input Hidden');
  let $ = load(firstPageResponse.data);

  const inputCpf = $('#cpf').attr('name') ?? '';
  const inputDataNascimento = $('#datanascimento').attr('name') ?? '';
  const inputPrimeiraHabilitacao = $('#dataprimeirahabilitacao').attr('name') ?? '';
  const _redirectPostToken = $('#content  input[name=_redirectPostToken]').val()?.toString() ?? '';

  const _TokenFields = $('#content input[name=_Token\\[fields\\]]').val()?.toString() ?? '';
    const _TokenUnlocked = $('#content input[name=_Token\\[unlocked\\]]').val()?.toString() ?? '';

    // 4. POST na pagina de consulta
    console.log('4. POST na pagina de consulta');

    const formData = new URLSearchParams({
        _method: 'POST',
        "_csrfToken": csrfToken,
        _redirectPostToken: _redirectPostToken, 
        [inputCpf]: cpf,
        [inputDataNascimento]: dataNascimento,
        [inputPrimeiraHabilitacao]: dataPrimeiraHabilitacao,
        "_Token[fields]": _TokenFields,
        "_Token[unlocked]": _TokenUnlocked,
      }).toString();
     
        const secondPageResponse = await axios.post('https://www.detran.mg.gov.br/habilitacao/prontuario/consultar-pontuacao-cnh/exibir-pontuacao-cnh', formData, {
            headers: {
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'pt-BR,pt;q=0.9',
                'Cache-Control': 'max-age=0',
                'Connection': 'keep-alive',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookiesString,
                Host: 'www.detran.mg.gov.br',
                Origin: 'https://www.detran.mg.gov.br',
                Referer: 'https://www.detran.mg.gov.br/habilitacao/prontuario/consultar-pontuacao-cnh',
                'sec-ch-ua': '"Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': '"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"',
            }
        });

        // 5. Capturar os dados
        console.log('5. Capturar os dados');

        $ = load(secondPageResponse.data);

        const overallContentArr = cleanArraySpaces($('#content').text().split('\n'))

        const timestamp = overallContentArr[0]
        const nome = overallContentArr[2]
        const cpfOverall = overallContentArr[4]
        const uf = overallContentArr[6]
        const totalPontos = Number(overallContentArr[8])

        const overallObject = {
            timestamp,
            [toCamelCase(overallContentArr[1])]: nome, // Nome
            [toCamelCase(overallContentArr[3])]: cpfOverall, // CPF
            [toCamelCase(overallContentArr[5])]: uf, // UF
            [toCamelCase(overallContentArr[7])]: totalPontos, // Total de Pontos
        }

        const TABLE_HEADERS_LENTGH = 5

        const tableValues = cleanArraySpaces($('table tr').text().split('\n'))
        const headers = tableValues.slice(0, TABLE_HEADERS_LENTGH)
        const rows = tableValues.slice(TABLE_HEADERS_LENTGH).map((_text, index) => {
            if (index % TABLE_HEADERS_LENTGH === 0) {
                const returnResponse: {[x: string]: string | number} = {}

                headers.forEach((header, ind) => {
                    returnResponse[toCamelCase(header)] = tableValues.slice(TABLE_HEADERS_LENTGH)[index + ind]
                })

                return returnResponse
            }
        }).filter(text => text !== undefined)

        const response = {
            infractions: rows,
            overall: overallObject
        }

        console.log(response)
        return res.status(200).send(response);
}

