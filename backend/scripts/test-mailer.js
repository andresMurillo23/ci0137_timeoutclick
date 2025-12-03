const { sendMail } = require('../utils/mailer');

async function run() {
  try {
    const info = await sendMail({
      to: 'recipient@example.com',
      subject: 'Prueba de correo - TimeoutClick',
      text: 'Este es un correo de prueba desde backend/utils/mailer.js',
      html: '<p>Este es un <strong>correo de prueba</strong> desde <em>backend/utils/mailer.js</em></p>'
    });
    console.log('sendMail result:', info && info.messageId ? info.messageId : info);
    process.exit(0);
  } catch (err) {
    console.error('Test mail failed:', err);
    process.exit(1);
  }
}

run();
