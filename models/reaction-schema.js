const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let reactionSchema = new Schema({
    email: {
        type: String
    },
    react_email:{
        type: String
    },
    type: {
        type: Number
    }
}, {
        collection: 'reactions'
    })

module.exports = mongoose.model('Reaction', reactionSchema)