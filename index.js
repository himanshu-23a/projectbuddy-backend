//Red flag -> index file ... app starting point 
const connectTOMongo = require("./db");
const express = require('express');
const app = express();
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

const server = http.createServer(app);
//const io = socketIO(server);

const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_URI || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

connectTOMongo();

const corsOptions = {
  origin: process.env.CORS_URI || 'http://localhost:3000',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
};

app.use(cors(corsOptions));

//app.use(cors());
app.use(express.json());

// Attach Socket.IO to the request object to access it in the routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

const port = process.env.PORT || 5000;



//Available routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/projects', require('./routes/projects'))
app.use('/api/discussions', require('./routes/discussions'));

// Set up Socket.IO connection
io.on('connection', (socket) => {
  console.log('Socket.IO: User connected');

  socket.on('newDiscussion', (discussion) => {
    console.log('Socket.IO: New Discussion Received', discussion);
    console.log(`Socket joined room: ${discussion.projectId}`);
    io.to(discussion.projectId).emit('newDiscussion', discussion);
    console.log('Socket.IO: New Discussion Emitted from server', discussion);
  });

  //Join Room

  socket.on('joinDiscussionRoom', ({ projectId }) => {
    socket.join(projectId);
  });  

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Socket.IO: User disconnected');
  });
});

server.listen(port, () => {
  console.log(`projectbuddy Backend listening on port ${port}`)
})
