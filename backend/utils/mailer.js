const nodemailer = require('nodemailer');

async function createTransporter() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

  if (EMAIL_HOST && EMAIL_USER && EMAIL_PASS) {
    const port = EMAIL_PORT ? parseInt(EMAIL_PORT, 10) : 587;
    return nodemailer.createTransport({
      host: EMAIL_HOST,
      port: port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    });
  }

  // Fallback: create Ethereal test account for development
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
}

/**
 * Send an email.
 * opts: { from, to, subject, text, html }
 */
async function sendMail(opts = {}) {
  const transporter = await createTransporter();

  const from = opts.from || process.env.EMAIL_FROM || 'TimeoutClick <no-reply@timeoutclick.local>';
  const mailOptions = {
    from,
    to: opts.to,
    subject: opts.subject || 'TimeoutClick Notification',
    text: opts.text || '',
    html: opts.html || undefined
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    // If we used Ethereal, this returns a preview URL
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) {
      console.log('[MAIL] Preview URL:', preview);
    }
    console.log('[MAIL] Message sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('[MAIL] Error sending mail:', err);
    throw err;
  }
}

module.exports = { sendMail };
