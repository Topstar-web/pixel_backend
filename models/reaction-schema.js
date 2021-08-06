const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let reactionSchema = new Schema({
    email: {
        type: String
    },
    react_email:{
        type: String
    },
    react_name: {
        type: String
    },
    type: {
        type: String
    }
}, {
        collection: 'reactions'
    })

module.exports = mongoose.model('Reaction', reactionSchema)