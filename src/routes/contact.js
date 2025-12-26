const express = require('express');
const router = express.Router();
const ContactController = require('../controllers/contactController');
const { authenticateApiKey } = require('../middleware/auth');
const { contactValidators } = require('../middleware/validator');

// Toutes les routes nécessitent une authentification
router.use(authenticateApiKey);

router.get('/check/:phoneNumber', contactValidators.phoneNumber, ContactController.checkPhoneNumber);
router.get('/profile-picture/:jid', contactValidators.jid, ContactController.getProfilePicture);
router.get('/status/:jid', contactValidators.jid, ContactController.getStatus);

module.exports = router;

