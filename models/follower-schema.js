const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let notificationSchema = new Schema({
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
        collection: 'notifications'
    })

module.exports = mongoose.model('Notification', notificationSchema)