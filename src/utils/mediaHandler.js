const axios = require('axios');
const { URL } = require('url');
const config = require('../config/env');
const logger = require('./logger');

/**
 * Valide qu'une URL média est autorisée (protection SSRF)
 */
function validateMediaUrl(url) {
  if (!url) {
    throw new Error('Media URL is required');
  }
  
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    throw new Error('Invalid URL format');
  }
  
  // Vérifier que c'est HTTPS (sauf localhost en dev)
  if (parsedUrl.protocol !== 'https:' && !parsedUrl.hostname.match(/^localhost|127\.0\.0\.1$/)) {
    throw new Error('Media URL must use HTTPS protocol');
  }
  
  // Vérifier la whitelist de domaines
  const whitelist = process.env.MEDIA_URL_WHITELIST 
    ? process.env.MEDIA_URL_WHITELIST.split(',').map(d => d.trim())
    : [];
  
  if (whitelist.length > 0) {
    const hostname = parsedUrl.hostname;
    const isAllowed = whitelist.some(domain => {
      // Support des domaines avec wildcard
      if (domain.startsWith('*.')) {
        const baseDomain = domain.slice(2);
        return hostname === baseDomain || hostname.endsWith('.' + baseDomain);
      }
      return hostname === domain;
    });
    
    if (!isAllowed) {
      throw new Error(`Media URL domain not in whitelist: ${hostname}`);
    }
  }
  
  // Bloquer les IPs privées (sauf localhost en dev)
  const hostname = parsedUrl.hostname;
  if (hostname.match(/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/) && 
      !hostname.match(/^localhost|127\.0\.0\.1$/)) {
    throw new Error('Media URL cannot point to private IP addresses');
  }
  
  return true;
}

/**
 * Télécharge un média depuis une URL de manière sécurisée
 */
async function downloadMediaSafe(url, timeout = 30000) {
  // Valider l'URL d'abord
  validateMediaUrl(url);
  
  return await downloadMedia(url, timeout);
}

/**
 * Télécharge un média depuis une URL
 */
async function downloadMedia(url, timeout = 30000) {
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer',
      timeout: timeout,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      // Ne pas suivre les redirections vers des IPs privées
      validateStatus: (status) => status >= 200 && status < 400
    });
    
    return Buffer.from(response.data);
  } catch (error) {
    logger.error('Error downloading media:', error.message);
    throw new Error(`Failed to download media: ${error.message}`);
  }
}

/**
 * Détecte le type MIME d'un fichier
 */
function detectMimeType(buffer, filename = '') {
  // Détection basique par extension
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    'mov': 'video/quicktime',
    '3gp': 'video/3gpp',
    'mp3': 'audio/mpeg',
    'ogg': 'audio/ogg',
    'wav': 'audio/wav',
    'aac': 'audio/aac',
    'm4a': 'audio/mp4',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Valide la taille d'un média
 */
function validateMediaSize(buffer, maxSizeMB = 16) {
  const sizeMB = buffer.length / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    throw new Error(`Media size (${sizeMB.toFixed(2)}MB) exceeds maximum (${maxSizeMB}MB)`);
  }
  return true;
}

/**
 * Valide le format d'une image
 */
function isValidImageFormat(mimetype) {
  const validFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return validFormats.includes(mimetype);
}

/**
 * Valide le format d'une vidéo
 */
function isValidVideoFormat(mimetype) {
  const validFormats = ['video/mp4', 'video/x-msvideo', 'video/x-matroska', 'video/quicktime', 'video/3gpp'];
  return validFormats.includes(mimetype);
}

/**
 * Valide le format d'un audio
 */
function isValidAudioFormat(mimetype) {
  const validFormats = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/aac', 'audio/mp4'];
  return validFormats.includes(mimetype);
}

module.exports = {
  validateMediaUrl,
  downloadMediaSafe,
  downloadMedia,
  detectMimeType,
  validateMediaSize,
  isValidImageFormat,
  isValidVideoFormat,
  isValidAudioFormat
};

