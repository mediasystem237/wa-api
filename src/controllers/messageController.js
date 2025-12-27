const MessageService = require('../services/MessageService');

class MessageController {
  static async sendText(req, res, next) {
    try {
      const { to, text } = req.body;
      const result = await MessageService.sendText(req.instance.instance_name, to, text);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  static async sendImage(req, res, next) {
    try {
      const { to, imageUrl, caption, filename } = req.body;
      const result = await MessageService.sendImage(req.instance.instance_name, to, imageUrl, caption, filename);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  static async sendVideo(req, res, next) {
    try {
      const { to, videoUrl, caption, filename, gifPlayback } = req.body;
      const result = await MessageService.sendVideo(req.instance.instance_name, { to, videoUrl, caption, filename, gifPlayback });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  static async sendDocument(req, res, next) {
    try {
      const { to, documentUrl, filename, caption } = req.body;
      const result = await MessageService.sendDocument(req.instance.instance_name, to, documentUrl, filename, caption);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  static async sendAudio(req, res, next) {
    try {
      const { to, audioUrl, ptt } = req.body;
      const result = await MessageService.sendAudio(req.instance.instance_name, to, audioUrl, ptt);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  static async sendLocation(req, res, next) {
    try {
      const { to, latitude, longitude, name, address } = req.body;
      const result = await MessageService.sendLocation(req.instance.instance_name, { to, latitude, longitude, name, address });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  static async sendContact(req, res, next) {
    try {
      const { to, contacts } = req.body;
      const result = await MessageService.sendContact(req.instance.instance_name, to, contacts);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  static async react(req, res, next) {
    try {
      const { messageId, emoji, remove } = req.body;
      const result = await MessageService.react(req.instance.instance_name, messageId, emoji, remove);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  static async reply(req, res, next) {
    try {
      const { to, text, quotedMessageId } = req.body;
      const result = await MessageService.reply(req.instance.instance_name, to, text, quotedMessageId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MessageController;

