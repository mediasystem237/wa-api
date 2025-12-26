const whatsappService = require('./WhatsAppService');
const WebhookService = require('./WebhookService');
const MessageMappingService = require('./MessageMappingService');
const { toJID } = require('../utils/phoneNumber');
const { downloadMediaSafe, detectMimeType, validateMediaSize } = require('../utils/mediaHandler');
const logger = require('../utils/logger');

class MessageService {
  /**
   * Envoie un message texte
   */
  static async sendText(instanceName, to, text) {
    const sock = whatsappService.getSocket(instanceName);
    if (!sock) {
      throw new Error('Instance not connected');
    }
    
    const jid = toJID(to);
    if (!jid) {
      throw new Error('Invalid phone number');
    }
    
    try {
      const sent = await sock.sendMessage(jid, { text });
      
      // Webhook message envoyé
      const connection = whatsappService.connections.get(instanceName);
      if (connection) {
        await WebhookService.sendAsync(
          connection.instanceId,
          connection.webhookUrl,
          'message.sent',
          {
            instance: instanceName,
            apiKey: connection.apiKey,
            messageId: sent.key.id,
            to: jid,
            timestamp: sent.messageTimestamp,
            status: 'pending'
          },
          connection.webhookEvents,
          connection.webhookSecret
        );
      }
      
      return {
        success: true,
        messageId: sent.key.id,
        timestamp: sent.messageTimestamp,
        to: jid
      };
    } catch (error) {
      logger.error(`[${instanceName}] Error sending text message:`, error);
      throw error;
    }
  }
  
  /**
   * Envoie une image
   */
  static async sendImage(instanceName, to, imageUrl, caption = '', filename = '') {
    const sock = whatsappService.getSocket(instanceName);
    if (!sock) {
      throw new Error('Instance not connected');
    }
    
    const jid = toJID(to);
    if (!jid) {
      throw new Error('Invalid phone number');
    }
    
    try {
      // Télécharger l'image de manière sécurisée (protection SSRF)
      const buffer = await downloadMediaSafe(imageUrl);
      validateMediaSize(buffer, 16); // 16MB max pour les images
      
      const mimetype = detectMimeType(buffer, filename);
      
      const sent = await sock.sendMessage(jid, {
        image: buffer,
        caption: caption || undefined,
        mimetype
      });
      
      return {
        success: true,
        messageId: sent.key.id,
        timestamp: sent.messageTimestamp,
        to: jid,
        mediaType: 'image'
      };
    } catch (error) {
      logger.error(`[${instanceName}] Error sending image:`, error);
      throw error;
    }
  }
  
  /**
   * Envoie une vidéo
   */
  static async sendVideo(instanceName, to, videoUrl, caption = '', filename = '', gifPlayback = false) {
    const sock = whatsappService.getSocket(instanceName);
    if (!sock) {
      throw new Error('Instance not connected');
    }
    
    const jid = toJID(to);
    if (!jid) {
      throw new Error('Invalid phone number');
    }
    
    try {
      const buffer = await downloadMediaSafe(videoUrl);
      validateMediaSize(buffer, 64); // 64MB max pour les vidéos
      
      const mimetype = detectMimeType(buffer, filename);
      
      const sent = await sock.sendMessage(jid, {
        video: buffer,
        caption: caption || undefined,
        mimetype,
        gifPlayback
      });
      
      return {
        success: true,
        messageId: sent.key.id,
        timestamp: sent.messageTimestamp,
        to: jid,
        mediaType: 'video'
      };
    } catch (error) {
      logger.error(`[${instanceName}] Error sending video:`, error);
      throw error;
    }
  }
  
  /**
   * Envoie un document
   */
  static async sendDocument(instanceName, to, documentUrl, filename, caption = '') {
    const sock = whatsappService.getSocket(instanceName);
    if (!sock) {
      throw new Error('Instance not connected');
    }
    
    const jid = toJID(to);
    if (!jid) {
      throw new Error('Invalid phone number');
    }
    
    try {
      const buffer = await downloadMediaSafe(documentUrl);
      validateMediaSize(buffer, 100); // 100MB max pour les documents
      
      const mimetype = detectMimeType(buffer, filename);
      
      const sent = await sock.sendMessage(jid, {
        document: buffer,
        mimetype,
        fileName: filename,
        caption: caption || undefined
      });
      
      return {
        success: true,
        messageId: sent.key.id,
        timestamp: sent.messageTimestamp,
        to: jid,
        mediaType: 'document'
      };
    } catch (error) {
      logger.error(`[${instanceName}] Error sending document:`, error);
      throw error;
    }
  }
  
  /**
   * Envoie un audio
   */
  static async sendAudio(instanceName, to, audioUrl, ptt = false) {
    const sock = whatsappService.getSocket(instanceName);
    if (!sock) {
      throw new Error('Instance not connected');
    }
    
    const jid = toJID(to);
    if (!jid) {
      throw new Error('Invalid phone number');
    }
    
    try {
      const buffer = await downloadMediaSafe(audioUrl);
      validateMediaSize(buffer, 16); // 16MB max pour les audios
      
      const mimetype = detectMimeType(buffer, '');
      
      const sent = await sock.sendMessage(jid, {
        audio: buffer,
        mimetype,
        ptt: ptt
      });
      
      return {
        success: true,
        messageId: sent.key.id,
        timestamp: sent.messageTimestamp,
        to: jid,
        mediaType: 'audio'
      };
    } catch (error) {
      logger.error(`[${instanceName}] Error sending audio:`, error);
      throw error;
    }
  }
  
  /**
   * Envoie une localisation
   */
  static async sendLocation(instanceName, to, latitude, longitude, name = '', address = '') {
    const sock = whatsappService.getSocket(instanceName);
    if (!sock) {
      throw new Error('Instance not connected');
    }
    
    const jid = toJID(to);
    if (!jid) {
      throw new Error('Invalid phone number');
    }
    
    try {
      const sent = await sock.sendMessage(jid, {
        location: {
          degreesLatitude: latitude,
          degreesLongitude: longitude,
          name: name || undefined,
          address: address || undefined
        }
      });
      
      return {
        success: true,
        messageId: sent.key.id,
        timestamp: sent.messageTimestamp,
        to: jid
      };
    } catch (error) {
      logger.error(`[${instanceName}] Error sending location:`, error);
      throw error;
    }
  }
  
  /**
   * Envoie un contact (vCard)
   */
  static async sendContact(instanceName, to, contacts) {
    const sock = whatsappService.getSocket(instanceName);
    if (!sock) {
      throw new Error('Instance not connected');
    }
    
    const jid = toJID(to);
    if (!jid) {
      throw new Error('Invalid phone number');
    }
    
    try {
      // Convertir les contacts en format vCard
      const vcards = contacts.map(contact => {
        let vcard = 'BEGIN:VCARD\n';
        vcard += 'VERSION:3.0\n';
        vcard += `FN:${contact.fullName}\n`;
        vcard += `TEL;TYPE=CELL:${contact.phoneNumber}\n`;
        if (contact.organization) {
          vcard += `ORG:${contact.organization}\n`;
        }
        if (contact.email) {
          vcard += `EMAIL:${contact.email}\n`;
        }
        vcard += 'END:VCARD';
        return vcard;
      });
      
      const sent = await sock.sendMessage(jid, {
        contacts: {
          displayName: contacts[0].fullName,
          contacts: vcards
        }
      });
      
      return {
        success: true,
        messageId: sent.key.id,
        timestamp: sent.messageTimestamp,
        to: jid
      };
    } catch (error) {
      logger.error(`[${instanceName}] Error sending contact:`, error);
      throw error;
    }
  }
  
  /**
   * Réagit à un message
   */
  static async react(instanceName, messageId, emoji, remove = false) {
    const sock = whatsappService.getSocket(instanceName);
    if (!sock) {
      throw new Error('Instance not connected');
    }
    
    try {
      // Extraire le JID et l'ID du message
      const [jid, id] = messageId.split('_');
      
      await sock.sendMessage(jid, {
        react: {
          text: remove ? '' : emoji,
          key: {
            remoteJid: jid,
            id: id
          }
        }
      });
      
      return {
        success: true,
        messageId,
        emoji,
        action: remove ? 'removed' : 'added'
      };
    } catch (error) {
      logger.error(`[${instanceName}] Error reacting to message:`, error);
      throw error;
    }
  }
  
  /**
   * Répond à un message (citation)
   */
  static async reply(instanceName, to, text, quotedMessageId) {
    const sock = whatsappService.getSocket(instanceName);
    if (!sock) {
      throw new Error('Instance not connected');
    }
    
    const jid = toJID(to);
    if (!jid) {
      throw new Error('Invalid phone number');
    }
    
    try {
      // Extraire le JID et l'ID du message cité
      const [quotedJid, quotedId] = quotedMessageId.includes('_') 
        ? quotedMessageId.split('_')
        : [jid, quotedMessageId];
      
      const sent = await sock.sendMessage(jid, {
        text,
        quoted: {
          remoteJid: quotedJid,
          fromMe: false,
          id: quotedId
        }
      });
      
      return {
        success: true,
        messageId: sent.key.id,
        timestamp: sent.messageTimestamp,
        to: jid
      };
    } catch (error) {
      logger.error(`[${instanceName}] Error replying to message:`, error);
      throw error;
    }
  }
}

module.exports = MessageService;

