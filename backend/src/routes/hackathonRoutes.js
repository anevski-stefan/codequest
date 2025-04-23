const express = require('express');
const router = express.Router();
const hackathonController = require('../controllers/hackathonController');
router.get('/', hackathonController.getHackathons);
router.get('/:id', hackathonController.getHackathonById);
router.post('/', hackathonController.createHackathon);
router.put('/:id', hackathonController.updateHackathon);
router.delete('/:id', hackathonController.deleteHackathon);
module.exports = router;