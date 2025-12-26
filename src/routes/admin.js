const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/auth');

// Toutes les routes nécessitent une authentification admin
router.use(authenticateAdmin);

router.get('/instances', AdminController.listInstances);
router.get('/metrics', AdminController.getMetrics);
router.get('/instance/:name/metrics', AdminController.getInstanceMetrics);
router.get('/instance/:name/logs', AdminController.getInstanceLogs);
router.post('/cleanup', AdminController.cleanup);

module.exports = router;

