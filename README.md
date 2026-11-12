# TáChegando-Zap

O TáChegando-Zap automatiza o atendimento de entregas e pós-venda direto no WhatsApp da sua empresa, usando a API oficial da Meta. Em vez de deixar o cliente esperando na fila ou preso em menus numéricos antigos ("digite 1 ou 2"), ele informa o CEP, confere o endereço e o prazo estimado em segundos usando botões clicáveis na própria tela. Se precisar falar com alguém da equipe, o sistema transfere a conversa e silencia as respostas automáticas para não atrapalhar o atendente.

## O que o sistema faz

- Substitui menus numéricos por botões interativos oficiais do WhatsApp (`Consultar Entrega`, `Confirmar Endereço`, `Digitar Outro CEP`, `Falar com Atendente`).
- Valida o CEP digitado, busca o endereço na API do ViaCEP e calcula o prazo estimado de entrega por região (2 dias úteis para o Sudeste e 5 dias úteis para os demais estados).
- Guarda a etapa da conversa de cada número em banco local (SQLite). Se o cliente demorar para responder ou o servidor reiniciar, o atendimento continua exatamente de onde parou.
- Impede respostas duplicadas registrando o ID de cada mensagem recebida (`wamid`).
- Pausa o robô automaticamente quando o cliente escolhe falar com um atendente, podendo ser reativado com `#reset`.

## Fluxo técnico

1. O cliente envia uma mensagem ou toca em um botão no WhatsApp e a Meta dispara um `POST /webhook` para o servidor.
2. O Express responde `200 OK` imediatamente antes de processar a mensagem, evitando timeout e reenvios da Meta.
3. Notificações internas de status (`sent`, `delivered`, `read`, `failed`) são ignoradas para não gerar loop.
4. O `message.id` é gravado no SQLite (`processed_messages`) com `INSERT OR IGNORE`; se já existir, o evento é descartado.
5. O bot lê em qual etapa o telefone está na tabela `sessions`, consulta o ViaCEP quando necessário, atualiza o estágio no banco e responde pela Graph API.

## Detalhes de implementação

- Banco local SQLite (`src/db.ts`) configurado com `journal_mode = WAL` para suportar leituras e escritas concorrentes sem travar o processo.
- Duas tabelas principais: `sessions` (`phone` como chave primária, `stage` e `updated_at` via `ON CONFLICT DO UPDATE`) e `processed_messages` (`message_id` como chave primária). A checagem de duplicidade usa `INSERT OR IGNORE` e verifica `changes === 0` em uma única operação atômica.
- Máquina de estados (`src/bot.ts`) controlada pelos estágios `MENU_INICIAL`, `AGUARDANDO_CEP`, `CONFIRMACAO_ENDERECO` e `ATENDIMENTO_HUMANO`, com comando global de reset (`#reset` ou botão `BTN_MENU`).
- Validação de CEP (`src/cep.ts`) feita antes da requisição HTTP: remove caracteres não numéricos e valida `/^[0-9]{8}$/`. A chamada ao ViaCEP usa timeout de 5 segundos e separa os retornos em `OK`, `FORMATO_ERRADO`, `NAO_ACHOU` e `ERRO_API`.
- Camada da Graph API (`src/whatsapp.ts`) configurada com timeout de 8 segundos no Axios, corte automático em até 3 botões por mensagem e limite de 20 caracteres por título de botão (exigência da API da Meta).
- Endpoints no servidor (`src/server.ts`): `GET /webhook` para verificação de `hub.mode === 'subscribe'` e `hub.verify_token`, devolvendo `hub.challenge` (ou `403`), e `POST /webhook` tratando mensagens do tipo `text` e `interactive` (`button_reply`).

## Arquivos do projeto

```text
tachegando-zap/
├── src/
│   ├── server.ts    (rotas GET e POST /webhook)
│   ├── whatsapp.ts  (envio de mensagens e botões na Graph API)
│   ├── db.ts        (SQLite em modo WAL para sessões e idempotência)
│   ├── cep.ts       (validação de CEP e consulta ao ViaCEP)
│   └── bot.ts       (regras da conversa e transbordo humano)
├── .env.example
├── package.json
└── tsconfig.json
```

## Tecnologias

Node.js, TypeScript, Express, Axios, SQLite (`better-sqlite3`), WhatsApp Cloud API (Meta) e ViaCEP.

## Como rodar

1. Clone o repositório e instale as dependências:

   ```bash
   git clone https://github.com/EduardoAndradeSLima/TaChegando-Zap.git
   cd TaChegando-Zap
   npm install
   ```

2. Copie o `.env.example` para `.env`:

   ```bash
   cp .env.example .env
   ```

   Preencha `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID` e `WEBHOOK_VERIFY_TOKEN` com as chaves do painel Meta for Developers. Se quiser testar tudo localmente apenas no terminal sem chamar a API da Meta, coloque `MOCK_ZAP=true`.

3. Suba o servidor em desenvolvimento:

   ```bash
   npm run dev
   ```

   Para compilar e rodar a versão final em JavaScript:

   ```bash
   npm run build
   npm start
   ```

4. Para receber webhooks reais da Meta na sua máquina, exponha a porta `3000` com o Ngrok e cadastre `https://SUA-URL/webhook` no painel da Meta:

   ```bash
   npx ngrok http 3000
   ```
