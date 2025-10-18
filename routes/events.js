const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const EventLog = require('../models/EventLog');
const dayjs = require('dayjs');

// Get all events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find().populate('profiles');
    console.log('GET /events - Found:', events.length);
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET events by profile ID - MUST BE BEFORE /:id route
router.get('/profile/:profileId', async (req, res) => {
  try {
    const profileId = req.params.profileId;
    console.log('=== Filtering events by profileId:', profileId);
    
    // First check what's in the database
    const allEvents = await Event.find().populate('profiles');
    console.log('Total events in DB:', allEvents.length);
    
    if (allEvents.length > 0) {
      console.log('Sample event profiles field:', allEvents[0].profiles);
      console.log('Sample event profiles type:', typeof allEvents[0].profiles);
    }
    
    // Query using $in since profiles is an array
    const events = await Event.find({ 
      profiles: profileId  // Changed from $in to direct match
    }).populate('profiles').sort({ startDate: -1 });
    
    console.log('Events found for profile:', events.length);
    res.json(events);
  } catch (error) {
    console.error('Error fetching events by profile:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create event
router.post('/', async (req, res) => {
  try {
    console.log('Creating event with data:', req.body);
    
    const event = new Event({
      title: req.body.title,
      description: req.body.description,
      profiles: req.body.profiles,
      timezone: req.body.timezone,
      startDate: dayjs.tz(req.body.startDate, req.body.timezone).toDate(),
      endDate: dayjs.tz(req.body.endDate, req.body.timezone).toDate()
    });

    // Validate end date is after start date
    if (event.endDate <= event.startDate) {
      return res.status(400).json({ 
        message: 'End date must be after start date'
      });
    }

    const newEvent = await event.save();
    const populatedEvent = await Event.findById(newEvent._id).populate('profiles');
    console.log('Event created with profiles:', populatedEvent.profiles);
    res.status(201).json(populatedEvent);
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(400).json({ 
      message: 'Event creation failed', 
      error: error.message 
    });
  }
});

// Update event
router.patch('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const previousEvent = { ...event._doc };
    
    // Update basic fields if provided
    if (req.body.title) event.title = req.body.title;
    if (req.body.description) event.description = req.body.description;
    if (req.body.profiles) event.profiles = req.body.profiles;
    if (req.body.timezone) event.timezone = req.body.timezone;
    
    // Update dates with timezone consideration
    if (req.body.startDate) {
      event.startDate = dayjs.tz(req.body.startDate, event.timezone).toDate();
    }
    if (req.body.endDate) {
      event.endDate = dayjs.tz(req.body.endDate, event.timezone).toDate();
    }

    // Validate end date is after start date
    if (event.endDate <= event.startDate) {
      return res.status(400).json({ 
        message: 'End date must be after start date'
      });
    }
    
    const updatedEvent = await event.save();

    // Create event log
    const eventLog = new EventLog({
      eventId: event._id,
      updatedBy: req.body.updatedBy,
      changes: []
    });

    // Log all changes
    const fieldsToCheck = ['title', 'description', 'timezone', 'profiles', 'startDate', 'endDate'];
    
    fieldsToCheck.forEach(field => {
      if (JSON.stringify(previousEvent[field]) !== JSON.stringify(event[field])) {
        eventLog.changes.push({
          field,
          oldValue: previousEvent[field],
          newValue: event[field]
        });
      }
    });

    // Only save log if there are changes
    if (eventLog.changes.length > 0) {
      await eventLog.save();
    }

    // Return populated event
    const populatedEvent = await Event.findById(event._id).populate('profiles');
    res.json(populatedEvent);

  } catch (error) {
    res.status(400).json({ 
      message: 'Failed to update event', 
      error: error.message 
    });
  }
});

// Delete event
router.delete('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await Event.deleteOne({ _id: req.params.id });
    await EventLog.deleteMany({ eventId: req.params.id });

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to delete event', 
      error: error.message 
    });
  }
});

router.get('/:id/logs', async (req, res) => {
  try {
    const logs = await EventLog.find({ eventId: req.params.id })
      .sort('-createdAt');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;