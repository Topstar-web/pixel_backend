const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let followerSchema = new Schema({
    email: {
        type: String
    },
    follower_email: {
        type: String
    },
    type: {
        type: Number
    },
    follow_time: {
        type: Date,
        default: new Date()
    }
}, {
        collection: 'followers'
    })

module.exports = mongoose.model('Follower', followerSchema)