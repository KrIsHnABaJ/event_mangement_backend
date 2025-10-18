const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');

// Get all profiles
router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.find();
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a profile
router.post('/', async (req, res) => {
  const profile = new Profile({
    name: req.body.name,
    timezone: req.body.timezone || 'UTC'
  });

  try {
    const newProfile = await profile.save();
    res.status(201).json(newProfile);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update profile timezone
router.patch('/:id', async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);
    if (req.body.timezone) {
      profile.timezone = req.body.timezone;
    }
    const updatedProfile = await profile.save();
    res.json(updatedProfile);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;