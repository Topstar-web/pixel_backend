const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let flagSchema = new Schema({
    email: {
        type: String
    },
    action_email: {
        type: String
    },
    flag_type:{
        type: Number
    }
}, {
        collection: 'flag_history'
    })

module.exports = mongoose.model('Flag', flagSchema)