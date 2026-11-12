import axios from 'axios';

export type EndInfo = {
  cep: string;
  rua: string;
  bairro: string;
  cidade: string;
  uf: string;
  prazo: number;
};

export type CepRes = {
  status: 'OK' | 'FORMATO_ERRADO' | 'NAO_ACHOU' | 'ERRO_API';
  data?: EndInfo;
};

const sudeste = ['SP', 'RJ', 'MG', 'ES'];

function limpaCep(txt: string): string | null {
  const nums = txt.replace(/\D/g, '');
  return /^[0-9]{8}$/.test(nums) ? nums : null;
}

export async function buscaCep(raw: string): Promise<CepRes> {
  const cep = limpaCep(raw);
  if (!cep) return { status: 'FORMATO_ERRADO' };

  try {
    const { data } = await axios.get(`https://viacep.com.br/ws/${cep}/json/`, {
      timeout: 5000,
    });

    if (data?.erro) return { status: 'NAO_ACHOU' };

    return {
      status: 'OK',
      data: {
        cep: data.cep,
        rua: data.logradouro || 'Logradouro geral',
        bairro: data.bairro || 'Centro',
        cidade: data.localidade,
        uf: data.uf,
        prazo: sudeste.includes(data.uf) ? 2 : 5,
      },
    };
  } catch (err) {
    console.error('Erro ViaCEP:', err);
    return { status: 'ERRO_API' };
  }
}
