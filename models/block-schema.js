const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let blockSchema = new Schema({
    email: {
        type: String
    },
    blocked_email: {
        type: String
    }
}, {
        collection: 'block_user'
    })

module.exports = mongoose.model('Block', blockSchema)