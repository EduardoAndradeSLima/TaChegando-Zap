import express from 'express';
import 'dotenv/config';

const app = express();
app.use(express.json());

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook verificado pela Meta!');
    res.status(200).send(challenge);
    return;
  }

  res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  try {
    const val = req.body?.entry?.[0]?.changes?.[0]?.value;
    const msg = val?.messages?.[0];
    if (!msg) return;

    const from: string = msg.from;
    let txt = '';

    if (msg.type === 'text') {
      txt = msg.text.body;
    } else if (msg.type === 'interactive' && msg.interactive?.type === 'button_reply') {
      txt = msg.interactive.button_reply.id;
    } else {
      return;
    }

    console.log(`[MSG] ${from}: ${txt}`);
  } catch (err) {
    console.error('Erro webhook:', err);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`TáChegando-Zap ON na porta ${port}`));
