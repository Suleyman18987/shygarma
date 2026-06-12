const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8667991444:AAGfRNElcY0zMPVXnWTwIUSoBC-38hrOxGM';

async function configureBot() {
  try {
    const desc = 'DarynSpace платформасының ата-аналарға арналған ресми көмекші боты. Оқушының үлгерімін бақылаңыз!';
    const shortDesc = 'DarynSpace ата-ана боты';

    console.log('Configuring bot description...');
    const resDesc = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyDescription`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc })
      }
    );
    const descData = await resDesc.json();
    console.log('setMyDescription response:', descData);

    console.log('Configuring bot short description...');
    const resShortDesc = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyShortDescription`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ short_description: shortDesc })
      }
    );
    const shortDescData = await resShortDesc.json();
    console.log('setMyShortDescription response:', shortDescData);

    console.log('Telegram bot configured successfully!');
  } catch (err) {
    console.error('Error configuring bot:', err);
  }
}

configureBot();
