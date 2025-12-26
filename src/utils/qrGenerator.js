const qrcode = require('qrcode');
const logger = require('./logger');

/**
 * Génère une image QR code en base64
 */
async function generateQRImage(qrString) {
  try {
    const qrImage = await qrcode.toDataURL(qrString, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrImage;
  } catch (error) {
    logger.error('Error generating QR image:', error);
    throw new Error('Failed to generate QR code image');
  }
}

/**
 * Génère une URL QR code (pour affichage web)
 */
async function generateQRURL(qrString) {
  try {
    const qrImage = await generateQRImage(qrString);
    return qrImage;
  } catch (error) {
    logger.error('Error generating QR URL:', error);
    throw error;
  }
}

module.exports = {
  generateQRImage,
  generateQRURL
};

