import axios from 'axios';
import { load } from 'cheerio';
import { RequestHandler } from "express";
import { getReCaptchaV2Response } from '../utils/captcha';
import { Cookie } from 'tough-cookie';

export const sefazHandler: RequestHandler = async (req, res) => {
    const { placa, renavam } = req.body;

    // 1. GET na pagina principal
    console.log('1. GET na pagina principal');
    const firstPageResponse = await axios.get('https://www.ipva.fazenda.sp.gov.br/ipvanet_consulta/consulta.aspx', {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Connection': 'keep-alive',
        'Host': 'www.ipva.fazenda.sp.gov.br',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Not_A Brand";v="99", "Google Chrome";v="109", "Chromium";v="109"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
      }
    });
  
    // 2. Capturar Cookie (Set-Cookie)
    console.log('2. Capturar Cookie (Set-Cookie)');
    const cookiesString = (firstPageResponse.headers['set-cookie'] ?? [])
      .map(cookieStr => Cookie.parse(cookieStr))
      .map(cookie => cookie?.cookieString())
      .join('; ')
      .trim();  
    
    // 3. Capturar os Input Hidden
    console.log('3. Capturar os Input Hidden');
    let $ = load(firstPageResponse.data);
  
    const eventTarget = $('#__EVENTTARGET').val()?.toString() ?? '';
    const eventArgument = $('#__EVENTARGUMENT').val()?.toString() ?? '';
    const viewState = $('#__VIEWSTATE').val()?.toString() ?? '';
    const viewStateGenerator = $('#__VIEWSTATEGENERATOR').val()?.toString() ?? '';
    const eventValidation = $('#__EVENTVALIDATION').val()?.toString() ?? '';
  
    const inputRenavamaName = $('#conteudoPaginaPlaceHolder_txtRenavam').attr('name') ?? '';
    const inputPlacaName = $('#conteudoPaginaPlaceHolder_txtPlaca').attr('name') ?? '';
    const buttonConsultarName = $('#conteudoPaginaPlaceHolder_btn_Consultar').attr('name') ?? '';
    const buttonConsultarValue = $('#conteudoPaginaPlaceHolder_btn_Consultar').val()?.toString() ?? '';
  
    // 4. Resolvendo Captcha
    console.log('4. Resolvendo Captcha');
    const captchaResponse = await getReCaptchaV2Response(
      '6Led7bcUAAAAAGqEoogy4d-S1jNlkuxheM7z2QWt',
      'https://www.ipva.fazenda.sp.gov.br/ipvanet_consulta/Consulta.aspx'
    );
  
    // 5. Submeter o formulário (Placa, Renavam, Valor dos input hidden e Captcha)
    console.log('5. Submeter o formulário (Placa, Renavam, Valor dos input hidden e Captcha)');
    const formData = new URLSearchParams({
      '__EVENTTARGET': eventTarget,
      '__EVENTARGUMENT': eventArgument,
      '__VIEWSTATE': viewState,
      '__VIEWSTATEGENERATOR': viewStateGenerator,
      '__EVENTVALIDATION': eventValidation,
      [inputRenavamaName]: renavam,
      [inputPlacaName]: placa,
      'g-recaptcha-response': captchaResponse,
      [buttonConsultarName]: buttonConsultarValue 
    }).toString();
    await axios.post('https://www.ipva.fazenda.sp.gov.br/ipvanet_consulta/Consulta.aspx', formData, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        // 'Content-Length: 1611
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookiesString,
        'Host': 'www.ipva.fazenda.sp.gov.br',
        'Origin': 'https://www.ipva.fazenda.sp.gov.br',
        'Referer': 'https://www.ipva.fazenda.sp.gov.br/ipvanet_consulta/consulta.aspx',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Not_A Brand";v="99", "Google Chrome";v="109", "Chromium";v="109"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
      }
    });
  
    // 6. GET na página aviso.aspx
    console.log('6. GET na página aviso.aspx');
    const getDataResponse = await axios.get('https://www.ipva.fazenda.sp.gov.br/ipvanet_consulta/Pages/Aviso.aspx', {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Cookie': cookiesString,
        'Host': 'www.ipva.fazenda.sp.gov.br',
        'Referer': 'https://www.ipva.fazenda.sp.gov.br/ipvanet_consulta/Consulta.aspx',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Not_A Brand";v="99", "Google Chrome";v="109", "Chromium";v="109"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
      }
    });
  
    // 6. Extrair os elementos da página de débitos
    console.log('6. Extrair os elementos da página de débitos');
    $ = load(getDataResponse.data);
    // const elementos = $('#conteudoPaginaPlaceHolder_Panel1 > table:nth-child(5) > tbody > tr > td').toArray();
    // console.log(elementos);
    const marcaModelo = $('#conteudoPaginaPlaceHolder_txtMarcaModelo').text().trim();
  
    // 7. Validar se existem multas (detalhamento)
    // 7.1 Subemeter o formulário para ter acesso à página de multas
    // 7.2 GET na página de multas (detalhamento)
    // 7.3 Extrair os elementos da página de multas (detalhamento)
  
    // 8. Retornar o payload
    return res.status(200).json({
      marcaModelo
    })
}