const whatsappService = require('../services/WhatsAppService');
const { toJID, isValidPhoneNumber } = require('../utils/phoneNumber');

class ContactController {
  static async checkPhoneNumber(req, res, next) {
    try {
      const { phoneNumber } = req.params;
      const sock = whatsappService.getSocket(req.instance.instance_name);
      
      if (!sock) {
        return res.status(424).json({
          error: 'Failed Dependency',
          message: 'Instance is not connected',
          code: 'INSTANCE_NOT_CONNECTED'
        });
      }
      
      if (!isValidPhoneNumber(phoneNumber)) {
        return res.json({
          success: true,
          exists: false,
          jid: null
        });
      }
      
      const jid = toJID(phoneNumber);
      
      try {
        // Vérifier si le numéro existe sur WhatsApp
        const [result] = await sock.onWhatsApp(jid);
        
        res.json({
          success: true,
          exists: result?.exists || false,
          jid: result?.exists ? jid : null
        });
      } catch (error) {
        res.json({
          success: true,
          exists: false,
          jid: null
        });
      }
    } catch (error) {
      next(error);
    }
  }
  
  static async getProfilePicture(req, res, next) {
    try {
      const { jid } = req.params;
      const sock = whatsappService.getSocket(req.instance.instance_name);
      
      if (!sock) {
        return res.status(424).json({
          error: 'Failed Dependency',
          message: 'Instance is not connected',
          code: 'INSTANCE_NOT_CONNECTED'
        });
      }
      
      try {
        const profilePicUrl = await sock.profilePictureUrl(jid);
        res.json({
          success: true,
          url: profilePicUrl
        });
      } catch (error) {
        res.json({
          success: true,
          url: null
        });
      }
    } catch (error) {
      next(error);
    }
  }
  
  static async getStatus(req, res, next) {
    try {
      const { jid } = req.params;
      const sock = whatsappService.getSocket(req.instance.instance_name);
      
      if (!sock) {
        return res.status(424).json({
          error: 'Failed Dependency',
          message: 'Instance is not connected',
          code: 'INSTANCE_NOT_CONNECTED'
        });
      }
      
      try {
        const status = await sock.fetchStatus(jid);
        res.json({
          success: true,
          status: status.status || null
        });
      } catch (error) {
        res.json({
          success: true,
          status: null
        });
      }
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ContactController;

