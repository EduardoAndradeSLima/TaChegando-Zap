import { getStage, setStage } from './db';
import { buscaCep } from './cep';
import { Btn, sendBtns, sendText } from './whatsapp';

const btnsConfirmacao: Btn[] = [
  { id: 'BTN_CONFIRMAR_SIM', title: 'Confirmar Endereço' },
  { id: 'BTN_CONFIRMAR_NAO', title: 'Digitar Outro CEP' },
  { id: 'BTN_HUMANO', title: 'Falar com Atendente' },
];

const btnsErroCep: Record<'FORMATO_ERRADO' | 'NAO_ACHOU' | 'ERRO_API', string> = {
  FORMATO_ERRADO: '⚠️ Formato de CEP inválido. Digite exatamente *8 números* (ex: 01001000) ou escolha uma opção:',
  NAO_ACHOU: '❌ Não encontramos este CEP nos Correios. Confira os números e tente novamente:',
  ERRO_API: '⚠️ O serviço de consulta de CEP está instável no momento. Deseja tentar novamente ou falar com nossa equipe?',
};

async function menuInicial(phone: string) {
  await sendBtns(
    phone,
    '👋 Olá! Bem-vindo ao *TáChegando-Zap*.\nEscolha uma das opções abaixo para agilizar seu atendimento:',
    [
      { id: 'BTN_CONSULTAR_CEP', title: 'Consultar Entrega' },
      { id: 'BTN_HUMANO', title: 'Falar com Atendente' },
    ]
  );
}

async function trataCep(phone: string, raw: string) {
  const res = await buscaCep(raw);

  if (res.status !== 'OK' || !res.data) {
    const msg = btnsErroCep[res.status === 'OK' ? 'ERRO_API' : res.status];
    await sendBtns(phone, msg, [
      { id: 'BTN_MENU', title: 'Voltar ao Menu' },
      { id: 'BTN_HUMANO', title: 'Falar com Atendente' },
    ]);
    return;
  }

  const { rua, bairro, cidade, uf, cep, prazo } = res.data;
  setStage(phone, 'CONFIRMACAO_ENDERECO');

  const resumo =
    `📍 *Endereço Localizado:*\n` +
    `• *Rua:* ${rua}\n` +
    `• *Bairro:* ${bairro}\n` +
    `• *Cidade/UF:* ${cidade}/${uf}\n` +
    `• *CEP:* ${cep}\n\n` +
    `🚚 *Prazo estimado:* até *${prazo} dias úteis*.\n\n` +
    `Os dados de entrega estão corretos?`;

  await sendBtns(phone, resumo, btnsConfirmacao);
}

export async function handleMsg(phone: string, input: string) {
  const txt = input.trim();
  const stage = getStage(phone);

  if (txt.toLowerCase() === '#reset' || txt === 'BTN_MENU') {
    setStage(phone, 'MENU_INICIAL');
    await menuInicial(phone);
    return;
  }

  if (stage === 'ATENDIMENTO_HUMANO') return;

  if (txt === 'BTN_HUMANO') {
    setStage(phone, 'ATENDIMENTO_HUMANO');
    await sendText(
      phone,
      '👨‍💻 Transferindo seu atendimento! Um especialista da nossa equipe já recebeu seu histórico e falará com você em instantes.'
    );
    return;
  }

  switch (stage) {
    case 'MENU_INICIAL':
      if (txt === 'BTN_CONSULTAR_CEP') {
        setStage(phone, 'AGUARDANDO_CEP');
        await sendText(
          phone,
          '📦 Perfeito! Digite apenas os *8 números do seu CEP* (ex: 01001000) para calcularmos o prazo de entrega:'
        );
      } else {
        await menuInicial(phone);
      }
      break;

    case 'AGUARDANDO_CEP':
      await trataCep(phone, txt);
      break;

    case 'CONFIRMACAO_ENDERECO':
      if (txt === 'BTN_CONFIRMAR_SIM') {
        setStage(phone, 'MENU_INICIAL');
        await sendBtns(
          phone,
          '✅ *Endereço confirmado com sucesso!* Seu pedido seguirá para expedição dentro do prazo informado. Precisa de mais alguma coisa?',
          [
            { id: 'BTN_CONSULTAR_CEP', title: 'Nova Consulta' },
            { id: 'BTN_HUMANO', title: 'Falar com Atendente' },
          ]
        );
      } else if (txt === 'BTN_CONFIRMAR_NAO') {
        setStage(phone, 'AGUARDANDO_CEP');
        await sendText(phone, '🔄 Sem problemas! Digite novamente o *CEP correto* (8 dígitos):');
      } else {
        await sendBtns(phone, 'Por favor, utilize um dos botões abaixo para confirmar seu endereço:', btnsConfirmacao);
      }
      break;
  }
}
