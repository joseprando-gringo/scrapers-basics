import { RequestHandler } from 'express';
import axios from 'axios';
import { Cookie } from 'tough-cookie';
import { getReCaptchaV2Response } from '../utils/captcha';
import { load } from 'cheerio';
import { cleanArraySpaces } from '../utils/cleanArraySpaces';
import { replaceRjAccents } from '../utils/replaceRjAccents';
import { toCamelCase } from '../utils/toCamelCase';

let sessionID = ""

// teste
// cpf = '99105667704'
// cnh = '00136825152'

export const rjCnhHandler: RequestHandler = async (req, res) => {
    const { cpf, cnh, uf = 'RJ' } = req.body;

        // 1. GET na pagina principal
        console.log('1. GET na pagina principal');

        const firstPageResponse = await axios.get('http://multas.detran.rj.gov.br/gaideweb2/consultaPontuacao', {
            headers: {
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Accept-Encoding": "gzip, deflate",
                "Accept-Language": "pt-BR,pt;q=0.9",
                Connection: "keep-alive",
                Host: "multas.detran.rj.gov.br",
                "Upgrade-Insecure-Requests": "1",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
            }
        });
    

    // 2. Capturar os Input Hidden
    console.log('2. Capturar os Input Hidden');
    let $ = load(firstPageResponse.data);

    const inputCPFName = $('#cpf').attr('name') ?? '';
    const inputCNH = $('#cnh').attr('name') ?? '';
    const selectUF = $('#uf').attr('name') ?? '';

    // 3. Resolvendo Captcha
    console.log('3. Resolvendo Captcha');
    const captchaResponse = await getReCaptchaV2Response(
      '6LdbMaYUAAAAAKDuamVtV8-MfAqzU9bbvoZMiJOv',
      'http://multas.detran.rj.gov.br/gaideweb2/consultaPontuacao'
    );

    console.log({captchaResponse})

        // 4. POST na pagina de consulta
        console.log('4. POST na pagina de consulta');
        const formData = new URLSearchParams({
            [inputCPFName]: cpf.toString(),
            [inputCNH]: cnh.toString(),
            [selectUF]: uf.toString(),
          'g-recaptcha-response': captchaResponse,
        }).toString();
        const secondPageResponse = await axios.post('http://multas.detran.rj.gov.br/gaideweb2/consultaPontuacao/busca', formData, {
          headers: {
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Encoding": "gzip, deflate",
            "Accept-Language": "pt-BR,pt;q=0.9",
            "Cache-Control": "max-age=0",
            "Connection": "keep-alive",
            "Content-Type": "application/x-www-form-urlencoded",
            Host: "multas.detran.rj.gov.br",
            Origin: "http://multas.detran.rj.gov.br",
            Referer: "http://multas.detran.rj.gov.br/gaideweb2/consultaPontuacao",
            "Upgrade-Insecure-Requests": "1",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
            ...sessionID ? { Cookie: sessionID } : {},
          }
        });

        // 6. Capturar Cookie (Set-Cookie)
        console.log('6. Capturar Cookie (Set-Cookie)');

        const cookiesString = (secondPageResponse.headers['set-cookie'] ?? [])
        .map(cookieStr => Cookie.parse(cookieStr))
        .map(cookie => cookie?.cookieString())
        .join('; ')
        .trim();  


        if (cookiesString) {
            sessionID = cookiesString
        }

        // 7. Capturar os dados
        console.log('7. Capturar os dados');
        $ = load(secondPageResponse.data);

        const driverInfo = $('.fundoMiolo > h3').toArray().map(el => cleanArraySpaces(replaceRjAccents($(el).text()).split('\n')))

        const overall = {
            cpf,
            cnh,
            uf,
            driverInfo
        }

        const FIRST_TABLE_HEADERS_LENTGH = 3
        const firstTableValues = cleanArraySpaces(replaceRjAccents($('#principal > table tr').text()).split('\n'))
        const firstHeaders = firstTableValues.slice(0, FIRST_TABLE_HEADERS_LENTGH)
        const firstRows = firstTableValues.slice(FIRST_TABLE_HEADERS_LENTGH).map((_text, index) => {
            if (index % FIRST_TABLE_HEADERS_LENTGH === 0) {
                const returnResponse: {[x: string]: string | number} = {}

                firstHeaders.forEach((header, ind) => {
                    returnResponse[toCamelCase(header)] = firstTableValues.slice(FIRST_TABLE_HEADERS_LENTGH)[index + ind]
                })

                return returnResponse
            }
        }).filter(text => text !== undefined)

        const SECOND_TABLE_HEADERS_LENTGH = 7
        const secondTableValues = cleanArraySpaces(replaceRjAccents($('.table-striped tr').text()).split('\n'))
        const secondHeaders = secondTableValues.slice(0, SECOND_TABLE_HEADERS_LENTGH)
        const secondRows = secondTableValues.slice(SECOND_TABLE_HEADERS_LENTGH).map((_text, index) => {
            if (index % SECOND_TABLE_HEADERS_LENTGH === 0) {
                const returnResponse: {[x: string]: string | number} = {}

                secondHeaders.forEach((header, ind) => {
                    returnResponse[toCamelCase(header)] = secondTableValues.slice(SECOND_TABLE_HEADERS_LENTGH)[index + ind]
                })

                return returnResponse
            }
        }).filter(text => text !== undefined)

        const responseObj = {
            overall,
            points: firstRows,
            allInfractions: secondRows,
        }

    return res.status(200).send(responseObj)
}

