const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/messageController');
const { authenticateApiKey } = require('../middleware/auth');
const { messageValidators } = require('../middleware/validator');

// Toutes les routes nécessitent une authentification
router.use(authenticateApiKey);

// Routes uniformisées (nouveau format)
// Les routes sans préfixe sont toujours supportées pour compatibilité

router.post('/send', messageValidators.send, MessageController.sendText);
router.post('/image', messageValidators.image, MessageController.sendImage);
router.post('/video', messageValidators.video, MessageController.sendVideo);
router.post('/document', messageValidators.document, MessageController.sendDocument);
router.post('/audio', messageValidators.audio, MessageController.sendAudio);
router.post('/location', messageValidators.location, MessageController.sendLocation);
router.post('/contact', messageValidators.contact, MessageController.sendContact);
router.post('/react', messageValidators.react, MessageController.react);
router.post('/reply', messageValidators.reply, MessageController.reply);

module.exports = router;

