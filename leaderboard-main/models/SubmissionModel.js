const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    code: String,
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    language: {
        type: String,
        default: null,
    },
    link_code: {
        type: String,
        default: null,
    },
    problem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Problem',
    },
    contest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contest',
    },
    contest_link_code: {
        type: String,
        default: null,
    },
    problem_link_code: {
        type: String,
        default: null,
    },
    problemTitle: {
        type: String,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        default: 'Pending',
    },
})

module.exports = mongoose.model("Submission", submissionSchema);