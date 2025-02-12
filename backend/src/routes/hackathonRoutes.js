const express = require('express');
const router = express.Router();
const hackathonController = require('../controllers/hackathonController');

// GET all hackathons
router.get('/', hackathonController.getAllHackathons);

// GET single hackathon by ID
router.get('/:id', hackathonController.getHackathonById);

// POST create new hackathon
router.post('/', hackathonController.createHackathon);

// PUT update hackathon
router.put('/:id', hackathonController.updateHackathon);

// DELETE hackathon
router.delete('/:id', hackathonController.deleteHackathon);

module.exports = router;