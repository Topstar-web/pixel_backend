const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let userSchema = new Schema({
    email: {
        type: String
    },
    password: {
        type: String
    },
    name: {
        type: String
    },
    photo: {
        type: String,
        default: ''
    },
    is_public: {
        type: Boolean,
        default: true //public
    },
    follow_list: {
        type:Array
    }
}, {
        collection: 'users'
    })

module.exports = mongoose.model('User', userSchema)