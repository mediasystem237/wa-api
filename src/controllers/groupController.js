const GroupService = require('../services/GroupService');

class GroupController {
  static async listGroups(req, res, next) {
    try {
      const groups = await GroupService.listGroups(req.instance.instance_name);
      res.json({
        success: true,
        groups
      });
    } catch (error) {
      next(error);
    }
  }
  
  static async getGroupDetails(req, res, next) {
    try {
      const { groupId } = req.params;
      const group = await GroupService.getGroupDetails(req.instance.instance_name, groupId);
      res.json({
        success: true,
        group
      });
    } catch (error) {
      next(error);
    }
  }
  
  static async createGroup(req, res, next) {
    try {
      const { name, participants } = req.body;
      const result = await GroupService.createGroup(req.instance.instance_name, name, participants);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
  
  static async addParticipants(req, res, next) {
    try {
      const { groupId } = req.params;
      const { participants } = req.body;
      const result = await GroupService.addParticipants(req.instance.instance_name, groupId, participants);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  static async removeParticipants(req, res, next) {
    try {
      const { groupId } = req.params;
      const { participants } = req.body;
      const result = await GroupService.removeParticipants(req.instance.instance_name, groupId, participants);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  static async leaveGroup(req, res, next) {
    try {
      const { groupId } = req.params;
      const result = await GroupService.leaveGroup(req.instance.instance_name, groupId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = GroupController;

