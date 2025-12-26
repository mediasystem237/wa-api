const whatsappService = require('./WhatsAppService');
const { toJID } = require('../utils/phoneNumber');
const logger = require('../utils/logger');

class GroupService {
  /**
   * Liste tous les groupes
   */
  static async listGroups(instanceName) {
    const sock = whatsappService.getSocket(instanceName);
    if (!sock) {
      throw new Error('Instance not connected');
    }
    
    try {
      const groups = await sock.groupFetchAllParticipating();
      const groupList = [];
      
      for (const [id, group] of Object.entries(groups)) {
        groupList.push({
          id,
          name: group.subject,
          description: group.desc || null,
          participants: Object.keys(group.participants || {}).length,
          createdAt: new Date(group.creation * 1000),
          isAdmin: group.participants[sock.user.id]?.admin === 'admin'
        });
      }
      
      return groupList;
    } catch (error) {
      logger.error(`[${instanceName}] Error listing groups:`, error);
      throw error;
    }
  }
  
  /**
   * Récupère les détails d'un groupe
   */
  static async getGroupDetails(instanceName, groupId) {
    const sock = whatsappService.getSocket(instanceName);
    if (!sock) {
      throw new Error('Instance not connected');
    }
    
    const jid = groupId.includes('@') ? groupId : `${groupId}@g.us`;
    
    try {
      const group = await sock.groupMetadata(jid);
      
      const participants = group.participants.map(p => ({
        id: p.id,
        isAdmin: p.admin === 'admin',
        isSuperAdmin: p.admin === 'superadmin'
      }));
      
      return {
        id: group.id,
        name: group.subject,
        description: group.desc || null,
        owner: group.owner || null,
        createdAt: new Date(group.creation * 1000),
        participants
      };
    } catch (error) {
      logger.error(`[${instanceName}] Error getting group details:`, error);
      throw error;
    }
  }
  
  /**
   * Crée un groupe
   */
  static async createGroup(instanceName, name, participants) {
    const sock = whatsappService.getSocket(instanceName);
    if (!sock) {
      throw new Error('Instance not connected');
    }
    
    try {
      const jids = participants.map(p => toJID(p));
      const group = await sock.groupCreate(name, jids);
      
      return {
        success: true,
        groupId: group.gid,
        inviteCode: group.inviteCode || null
      };
    } catch (error) {
      logger.error(`[${instanceName}] Error creating group:`, error);
      throw error;
    }
  }
  
  /**
   * Ajoute des participants à un groupe
   */
  static async addParticipants(instanceName, groupId, participants) {
    const sock = whatsappService.getSocket(instanceName);
    if (!sock) {
      throw new Error('Instance not connected');
    }
    
    const jid = groupId.includes('@') ? groupId : `${groupId}@g.us`;
    const jids = participants.map(p => toJID(p));
    
    try {
      await sock.groupParticipantsUpdate(jid, jids, 'add');
      return { success: true };
    } catch (error) {
      logger.error(`[${instanceName}] Error adding participants:`, error);
      throw error;
    }
  }
  
  /**
   * Retire des participants d'un groupe
   */
  static async removeParticipants(instanceName, groupId, participants) {
    const sock = whatsappService.getSocket(instanceName);
    if (!sock) {
      throw new Error('Instance not connected');
    }
    
    const jid = groupId.includes('@') ? groupId : `${groupId}@g.us`;
    const jids = participants.map(p => toJID(p));
    
    try {
      await sock.groupParticipantsUpdate(jid, jids, 'remove');
      return { success: true };
    } catch (error) {
      logger.error(`[${instanceName}] Error removing participants:`, error);
      throw error;
    }
  }
  
  /**
   * Quitte un groupe
   */
  static async leaveGroup(instanceName, groupId) {
    const sock = whatsappService.getSocket(instanceName);
    if (!sock) {
      throw new Error('Instance not connected');
    }
    
    const jid = groupId.includes('@') ? groupId : `${groupId}@g.us`;
    
    try {
      await sock.groupLeave(jid);
      return { success: true };
    } catch (error) {
      logger.error(`[${instanceName}] Error leaving group:`, error);
      throw error;
    }
  }
}

module.exports = GroupService;

