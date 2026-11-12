import axios from 'axios';
import 'dotenv/config';

export type Btn = { id: string; title: string };

const ver = process.env.GRAPH_API_VERSION || 'v20.0';
const phoneId = process.env.PHONE_NUMBER_ID;
const token = process.env.WHATSAPP_TOKEN;
const isMock = process.env.MOCK_ZAP === 'true';

const api = axios.create({
  baseURL: `https://graph.facebook.com/${ver}/${phoneId}`,
  timeout: 8000,
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

export async function sendText(to: string, body: string) {
  console.log(`[ZAP -> ${to}]: ${body}`);
  if (isMock || !token || !phoneId) return;

  try {
    await api.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body },
    });
  } catch (err: any) {
    console.error('Erro sendText:', err.response?.data || err.message);
  }
}

export async function sendBtns(to: string, txt: string, btns: Btn[]) {
  console.log(`[ZAP -> ${to}]: ${txt} | ${btns.map((b) => `[${b.title}]`).join(' ')}`);
  if (isMock || !token || !phoneId) return;

  try {
    await api.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: txt },
        action: {
          buttons: btns.slice(0, 3).map((b) => ({
            type: 'reply',
            reply: { id: b.id, title: b.title.slice(0, 20) },
          })),
        },
      },
    });
  } catch (err: any) {
    console.error('Erro sendBtns:', err.response?.data || err.message);
  }
}
