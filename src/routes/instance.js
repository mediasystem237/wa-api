const express = require('express');
const router = express.Router();
const InstanceController = require('../controllers/instanceController');
const { authenticateApiKey } = require('../middleware/auth');
const { instanceValidators } = require('../middleware/validator');

// Créer une instance (public)
router.post('/', instanceValidators.create, InstanceController.create);

// Routes avec ID explicite
router.get('/:id', authenticateApiKey, InstanceController.getStatus);
router.post('/:id/connect', authenticateApiKey, InstanceController.connect);
router.post('/:id/disconnect', authenticateApiKey, InstanceController.disconnect);
router.post('/:id/restart', authenticateApiKey, InstanceController.restart);
router.post('/:id/reset-session', authenticateApiKey, InstanceController.resetSession);
router.delete('/:id', authenticateApiKey, InstanceController.delete);
router.patch('/:id/webhook', authenticateApiKey, instanceValidators.updateWebhook, InstanceController.updateWebhook);

// Routes de compatibilité (dépréciées, utiliser les routes avec ID)
router.post('/create', instanceValidators.create, InstanceController.create);
router.post('/connect', authenticateApiKey, InstanceController.connect);
router.get('/status', authenticateApiKey, InstanceController.getStatus);
router.post('/disconnect', authenticateApiKey, InstanceController.disconnect);
router.post('/restart', authenticateApiKey, InstanceController.restart);
router.delete('/delete', authenticateApiKey, InstanceController.delete);
router.patch('/webhook', authenticateApiKey, instanceValidators.updateWebhook, InstanceController.updateWebhook);

module.exports = router;

