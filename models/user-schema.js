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
        default: false // set private by default
    },
    noti_status: {
        type: Number,
        default: false // set no noti by default
    },
    follow_list: {
        type:Array
    },
    block_list: {
        type:Array,
        default:[]
    }
}, {
        collection: 'users'
    })

module.exports = mongoose.model('User', userSchema)