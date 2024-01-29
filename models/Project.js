const mongoose = require('mongoose')
const { Schema } = mongoose;


const ProjectSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        default: "None"
    },
    team_members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }],
    requests: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        },
        status: {
            type: String,
            enum: ['pending', 'accepted'],
            default: 'pending'
        }
    }],
    members_no: {
        type: Number,
        default: 1
    },
    weeks: {
        type: Number,
        default: 1
    },
    open_closed: {
        type: String,
        enum: ['Open to Work', 'Closed'],
        default: 'Open to Work'
    },
    status: {
        type: String,
        enum: ['In Progress', 'Completed'],
        default: 'In Progress'
    },
    skills_required: {
        type: [String],
        default: "None"
    },
    repository_link: {
        type: String,
        default: "None"
    },
    discussions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'discussion'
    }],
    date: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('project', ProjectSchema);