const getBaseStyles = () => `
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f7; color: #51545E; margin: 0; padding: 0; }
  .email-wrapper { width: 100%; background-color: #f4f4f7; padding: 40px 0; }
  .email-content { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
  .email-header { background-color: #4f46e5; padding: 24px; text-align: center; }
  .email-header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px; }
  .email-body { padding: 40px; }
  .email-body h2 { color: #333333; margin-top: 0; font-size: 22px; font-weight: bold; }
  .email-body p { line-height: 1.6; font-size: 16px; color: #51545E; }
  .otp-code { display: block; width: fit-content; margin: 30px auto; background-color: #f4f4f7; border: 2px dashed #4f46e5; border-radius: 8px; padding: 15px 30px; font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; color: #4f46e5; letter-spacing: 5px; text-align: center; }
  .action-button { display: block; width: fit-content; margin: 30px auto; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 16px; text-align: center; }
  .email-footer { background-color: #f4f4f7; padding: 24px; text-align: center; color: #6b6e76; font-size: 12px; }
`;

exports.verificationEmail = (code) => `
<!DOCTYPE html>
<html>
<head>
  <style>${getBaseStyles()}</style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-content">
      <div class="email-header">
        <h1>AMHARIC TTS</h1>
      </div>
      <div class="email-body">
        <h2>Verify Your Email</h2>
        <p>Thanks for getting started with Amharic Expressive TTS! We're excited to have you on board.</p>
        <p>Please use the following verification code to complete your registration:</p>
        <div class="otp-code">${code}</div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
      </div>
      <div class="email-footer">
        <p>&copy; ${new Date().getFullYear()} Amharic Expressive TTS. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

exports.resetPasswordEmail = (url) => `
<!DOCTYPE html>
<html>
<head>
  <style>${getBaseStyles()}</style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-content">
      <div class="email-header">
        <h1>AMHARIC TTS</h1>
      </div>
      <div class="email-body">
        <h2>Reset Your Password</h2>
        <p>We received a request to reset your password for your Amharic TTS account.</p>
        <p>Click the button below to set a new password:</p>
        <a href="${url}" class="action-button">Reset Password</a>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <p style="font-size: 14px; margin-top: 30px; color: #999;">Or copy and paste this link into your browser:<br><a href="${url}" style="color: #4f46e5;">${url}</a></p>
      </div>
      <div class="email-footer">
        <p>&copy; ${new Date().getFullYear()} Amharic Expressive TTS. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
