const express = require('express');
const router = express.Router();
const ArenaRoom = require('../models/ArenaRoom');
const ArenaMatch = require('../models/ArenaMatch');
const Question = require('../models/Question');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Generate unique room code
const generateRoomCode = () => {
  const code = Math.floor(1000 + Math.random() * 9000);
  return `ARENA-ROYALE-${code}`;
};

/**
 * @route   POST /api/arena/create
 * @desc    Create a private battle room
 */
router.post('/create', async (req, res) => {
  const { difficulty } = req.body;
  const targetDifficulty = ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium';

  try {
    const roomCode = generateRoomCode();
    const newRoom = new ArenaRoom({
      roomCode,
      difficulty: targetDifficulty,
      player1: {
        userId: req.user.id,
        username: req.user.name,
        ready: false,
        connected: false
      },
      player2: {
        userId: null,
        username: '',
        ready: false,
        connected: false
      },
      status: 'waiting'
    });

    await newRoom.save();
    res.status(201).json(newRoom);
  } catch (error) {
    console.error('Error creating arena room:', error);
    res.status(500).json({ message: 'Server error creating private room' });
  }
});

/**
 * @route   GET /api/arena/room/:code
 * @desc    Get details of an arena room
 */
router.get('/room/:code', async (req, res) => {
  const { code } = req.params;

  try {
    const room = await ArenaRoom.findOne({ roomCode: code });
    if (!room) {
      return res.status(404).json({ message: 'Lobby code not found.' });
    }

    if (room.questionId) {
      await room.populate('questionId');
    }

    res.status(200).json(room);
  } catch (error) {
    console.error('Error checking room:', error);
    res.status(500).json({ message: 'Server error retrieving room details' });
  }
});

/**
 * @route   GET /api/arena/history
 * @desc    Get user's arena match history
 */
router.get('/history', async (req, res) => {
  try {
    const history = await ArenaMatch.find({ userId: req.user.id })
      .populate('questionId')
      .sort({ date: -1 });

    res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching arena history:', error);
    res.status(500).json({ message: 'Server error fetching match history' });
  }
});

module.exports = router;
