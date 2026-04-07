const mongoose = require('mongoose');

const leaderBoardSchema = new mongoose.Schema({
    contest_link_code: {
        type: String,
        required: true,
    },
    last_updated: {
        type: Date,
        default: Date.now,
    },
    startTime: {
        type: Date,
        required: true,
    },
    endTime: {
        type: Date,
        required: true,
    },
    rank_list: [
        {
            user: {
                email: {
                    type: String,
                    required: true,
                },
                name: {
                    type: String,
                    required: true,
                },
            },
            score: {
                type: Number,
                default: 0,
            },
            latestAC: {
                type: Date,
                default: Date.now,
            },
            problemsSolvedIds: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Problem',
                },
            ],
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('LeaderBoard', leaderBoardSchema);
