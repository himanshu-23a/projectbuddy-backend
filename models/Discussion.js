// models/Discussion.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const DiscussionSchema = new Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'project'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('discussion', DiscussionSchema);
