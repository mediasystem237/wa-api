const express = require('express');
const router = express.Router();
const GroupController = require('../controllers/groupController');
const { authenticateApiKey } = require('../middleware/auth');
const { groupValidators } = require('../middleware/validator');

// Toutes les routes nécessitent une authentification
router.use(authenticateApiKey);

router.get('/', GroupController.listGroups);
router.get('/:groupId', groupValidators.groupId, GroupController.getGroupDetails);
router.post('/', groupValidators.create, GroupController.createGroup);
router.post('/:groupId/participants', groupValidators.groupId, groupValidators.participants, GroupController.addParticipants);
router.delete('/:groupId/participants', groupValidators.groupId, groupValidators.participants, GroupController.removeParticipants);
router.post('/:groupId/leave', groupValidators.groupId, GroupController.leaveGroup);

module.exports = router;

