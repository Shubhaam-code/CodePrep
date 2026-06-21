const ArenaRoom = require('./models/ArenaRoom');
const ArenaMatch = require('./models/ArenaMatch');
const Question = require('./models/Question');
const User = require('./models/User');

module.exports = function (io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join room
    socket.on('join_room', async ({ roomCode, userId, username }) => {
      try {
        if (!roomCode || !userId) {
          socket.emit('error_message', 'Room code and user authentication required.');
          return;
        }

        let room = await ArenaRoom.findOne({ roomCode });
        if (!room) {
          socket.emit('error_message', 'Room not found.');
          return;
        }

        // Check if player is already registered in the room
        const isPlayer1 = room.player1 && room.player1.userId && room.player1.userId.toString() === userId.toString();
        const isPlayer2 = room.player2 && room.player2.userId && room.player2.userId.toString() === userId.toString();

        if (isPlayer1) {
          room.player1.socketId = socket.id;
          room.player1.connected = true;
          room.player1.username = username;
        } else if (isPlayer2) {
          room.player2.socketId = socket.id;
          room.player2.connected = true;
          room.player2.username = username;
        } else {
          // If room has player1 but no player2, register this user as player2
          if (!room.player2 || !room.player2.userId) {
            room.player2 = {
              userId: userId,
              username: username,
              ready: false,
              socketId: socket.id,
              connected: true
            };
          } else {
            socket.emit('error_message', 'Room is already full.');
            return;
          }
        }

        await room.save();
        socket.join(roomCode);
        
        // Populate question if exists
        if (room.questionId) {
          await room.populate('questionId');
        }

        io.to(roomCode).emit('room_updated', room);
        console.log(`User ${username} joined room ${roomCode}`);
      } catch (err) {
        console.error('Socket join_room error:', err);
        socket.emit('error_message', 'Server error joining room.');
      }
    });

    // Toggle Ready status
    socket.on('toggle_ready', async ({ roomCode, userId }) => {
      try {
        let room = await ArenaRoom.findOne({ roomCode });
        if (!room) return;

        if (room.player1 && room.player1.userId && room.player1.userId.toString() === userId.toString()) {
          room.player1.ready = !room.player1.ready;
        } else if (room.player2 && room.player2.userId && room.player2.userId.toString() === userId.toString()) {
          room.player2.ready = !room.player2.ready;
        }

        // If both players are joined and ready, trigger countdown
        const p1Ready = room.player1 && room.player1.ready;
        const p2Ready = room.player2 && room.player2.ready;

        if (p1Ready && p2Ready) {
          room.status = 'countdown';
          await room.save();
          io.to(roomCode).emit('room_updated', room);

          // Server-side countdown tick
          let counter = 5;
          const interval = setInterval(async () => {
            io.to(roomCode).emit('countdown_tick', counter);
            counter--;

            if (counter < 0) {
              clearInterval(interval);
              try {
                // Pick a random question from DB matching selected difficulty
                const roomObj = await ArenaRoom.findOne({ roomCode });
                const filter = {};
                if (roomObj.difficulty) {
                  filter.difficulty = roomObj.difficulty;
                }
                const questions = await Question.find(filter);
                let selectedQ;
                if (questions.length > 0) {
                  selectedQ = questions[Math.floor(Math.random() * questions.length)];
                } else {
                  selectedQ = await Question.findOne(); // absolute fallback
                }

                if (!selectedQ) {
                  io.to(roomCode).emit('error_message', 'No questions found in database.');
                  return;
                }

                roomObj.questionId = selectedQ._id;
                roomObj.status = 'active';
                roomObj.startedAt = new Date();
                await roomObj.save();

                await roomObj.populate('questionId');
                io.to(roomCode).emit('game_start', roomObj);
              } catch (innerErr) {
                console.error(innerErr);
              }
            }
          }, 1000);
        } else {
          await room.save();
          if (room.questionId) await room.populate('questionId');
          io.to(roomCode).emit('room_updated', room);
        }
      } catch (err) {
        console.error('Socket toggle_ready error:', err);
      }
    });

    // Code submission evaluation in duel
    socket.on('submit_solution', async ({ roomCode, userId, code, language, runtime, memory, isCorrect }) => {
      try {
        let room = await ArenaRoom.findOne({ roomCode });
        if (!room || room.status !== 'active') return;

        const isPlayer1 = room.player1 && room.player1.userId && room.player1.userId.toString() === userId.toString();
        const isPlayer2 = room.player2 && room.player2.userId && room.player2.userId.toString() === userId.toString();

        const submitTime = new Date();
        const duration = room.startedAt ? Math.floor((submitTime - room.startedAt) / 1000) : 0; // seconds

        // Add user submission to room array
        room.playersSubmitted.push({
          userId,
          submissionTime: submitTime,
          runtime: runtime || 0,
          memory: memory || 0,
          code,
          language
        });

        await room.save();

        if (isCorrect) {
          // Player won the duel!
          room.status = 'finished';
          room.winnerId = userId;
          await room.save();

          const p1 = room.player1;
          const p2 = room.player2;
          const winnerIdStr = userId.toString();

          const player1Won = p1.userId.toString() === winnerIdStr;
          
          // Save Match History for Player 1
          const match1 = new ArenaMatch({
            userId: p1.userId,
            opponentId: p2.userId,
            opponentName: p2.username,
            questionId: room.questionId,
            questionTitle: (await Question.findById(room.questionId))?.title || 'Coding Challenge',
            result: player1Won ? 'win' : 'loss',
            runtime: player1Won ? runtime : 0,
            memory: player1Won ? memory : 0,
            date: submitTime
          });
          await match1.save();

          // Save Match History for Player 2
          const match2 = new ArenaMatch({
            userId: p2.userId,
            opponentId: p1.userId,
            opponentName: p1.username,
            questionId: room.questionId,
            questionTitle: match1.questionTitle,
            result: player1Won ? 'loss' : 'win',
            runtime: player1Won ? 0 : runtime,
            memory: player1Won ? 0 : memory,
            date: submitTime
          });
          await match2.save();

          // Emit game over state
          io.to(roomCode).emit('game_over', {
            room,
            winnerId: userId,
            winnerUsername: isPlayer1 ? p1.username : p2.username,
            runtime,
            memory,
            duration
          });
        } else {
          // Tell others opponent submitted but failed (incorrect output)
          socket.to(roomCode).emit('opponent_submitted', { userId, isCorrect: false });
        }
      } catch (err) {
        console.error('Socket submit_solution error:', err);
      }
    });

    // Handle user disconnect
    socket.on('disconnect', async () => {
      try {
        console.log(`Socket disconnected: ${socket.id}`);
        // Find rooms where this socket was active
        const rooms = await ArenaRoom.find({
          $or: [
            { 'player1.socketId': socket.id },
            { 'player2.socketId': socket.id }
          ]
        });

        for (let room of rooms) {
          if (room.player1 && room.player1.socketId === socket.id) {
            room.player1.connected = false;
          } else if (room.player2 && room.player2.socketId === socket.id) {
            room.player2.connected = false;
          }
          await room.save();
          if (room.questionId) await room.populate('questionId');
          io.to(room.roomCode).emit('room_updated', room);
        }
      } catch (err) {
        console.error('Socket disconnect handler error:', err);
      }
    });
  });
};
