const mongoose = require('mongoose');

const contestSchema = new mongoose.Schema({
    title: String,
    description: String,
    startTime: Date,
    endTime: Date,
    link_code: String,
    onGoing: {
        type: Boolean,
        default: true,
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    participants: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    admin: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    problems: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Problem',
        },
    ],
    problemLinkCodes: [
        {
            type: String,
        },
    ],  
    createdAt: {
        type: Date,
        default: Date.now,
    },
    submissions: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Submission',
            default: [],
        },
    ],
})

module.exports = mongoose.model("Contest", contestSchema);