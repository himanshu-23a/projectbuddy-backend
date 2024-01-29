//Red flag
const mongoose = require('mongoose')
const { Schema } = mongoose;

const UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        default: function () {
            return this.username;
        }
    },
    bio: {
        type: String,
        default: "None"
    },
    skills: {
        type: [String],
        default: "None"
    },
    institute: {
        type: String,
        default: "None"
    },
    profile_picture: {
        type: String,
        default: "..\images\profile.jpg"
    },
    role: {
        type: String,
        default: "Other"
    },
    joinedProjects: [{
        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'project'
        },
        status: {
            type: String,
            enum: ['pending', 'accepted'],
            default: 'pending'
        }
    }],
    date: {
        type: Date,
        default: Date.now
    }
})

const User = mongoose.model('user', UserSchema);
module.exports = User;