// Set your own secrates here!
const privateKey = process.env.TELEBIRR_PRIVATE_KEY
  ? process.env.TELEBIRR_PRIVATE_KEY.replace(/\\n/g, '\n')
  : '';

module.exports = {
  baseUrl: process.env.TELEBIRR_API_URL || "https://app.ethiotelebirr.et",
  fabricAppId: process.env.TELEBIRR_APP_ID,
  appSecret: process.env.TELEBIRR_APP_SECRET,
  merchantAppId: process.env.TELEBIRR_MERCHANT_APP_ID,
  merchantCode: process.env.TELEBIRR_MERCHANT_CODE,
  privateKey: privateKey,
};
