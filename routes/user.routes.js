let bcrypt = require('bcryptjs');

let jwt = require('jsonwebtoken');
let mongoose = require('mongoose'),
    express = require('express'),
    router = express.Router();

let user = require('../models/user-schema');
let reaction = require('../models/reaction-schema');
let flag_history = require('../models/flag-schema');
let noti_table = require('../models/follower-schema');

//check Login
router.route('/check').post((req,res,next) => {

    const token = req.body.token;
    
    try {
        decodedToken = jwt.verify(token, 'secret');
    } catch (err) {
        return res.status(500).json({ message: err.message || 'could not decode the token' });
    };
    if (!decodedToken) {
        res.status(401).json({ message: 'unauthorized' });
    } else {
        user.find({'email':decodedToken.email},(error,data)=>{
            if(error){
                return res.status(404).json({message: "user not found"});
            } else{
                // password hash
                if(data.length == 0)
                    return res.status(404).json({message: "user not found"});
                res.status(200).json({ message: 'here is your resource' , "user":data[0]});
            }
        });    
        
    };
});

router.route('/accept_follow').post((req, res, next) => {
    //change noti type
    noti_table.findOneAndUpdate({_id:req.body.noti_id}, {$set:{"type":1}},(err, update_data)=>{
        if(err){
            return res.status(404).json({message: "user not found"});
        } else{
            //send notification to B
            noti_table.create({
                email:req.body.follower_email,
                follower_email:req.body.email,
                type:2,
                follow_time:new Date()
            }, (error, data) => {
                if (error) {
                    return res.status(502).json({message: "error while creating user"});
                } else {
                    user.findOneAndUpdate({email:req.body.follower_email}, {$set:{"noti_status":true}},(err, data)=>{
                        if(err){
                            return res.status(404).json({message: "user not found"});
                        } else{
                            //set type = 1 in follow_list of B
                            user.updateMany({'email':req.body.follower_email,'follow_list.name':req.body.email},{'$set':{'follow_list.$.type':1}},(error,data)=>{
                                if(error)
                                    return res.status(500).json({message: "error while set type = 1 in follow_list"});
                                else{
                                    return res.status(200).json({message:"success"});
                                }
                            });
                        }
                    });
                }
            })
        }
    });
});

router.route('/decline_follow').post((req, res, next) => {
    
    //remove from feed_list
    user.update({email:req.body.follower_email},{$pull:{follow_list:{
        name : req.body.email
    }}},(err,data) => {
        if(err){
            return res.status(404).json({message: "user not found"});
        } else{
            // remove from noti_table
            noti_table.remove({_id:req.body.noti_id},(error,data)=>{
                if(error)
                    return res.status(500).json({message: "error while reseting reactions"});
                return res.status(200).json({message:"success"});
            })
        }
    });
});

router.route('/get_notification_list').post((req, res, next) => {

    user.findOneAndUpdate({email:req.body.email}, {$set:{"noti_status":false}},(err, update_data)=>{
        if(err){
            return res.status(404).json({message: "user not found"});
        } else{
            noti_table.aggregate([
                {
                    $match: {
                        email: req.body.email
                    }
                },  {
                    $lookup: {
                        from: "users",
                        localField: "follower_email",
                        foreignField: "email",
                        as: "user"
                    }
                }, {
                    $project:{
                        "_id":1,
                        "follower_email":1,
                        "follow_time":1,
                        "user.name":1,
                        "user.photo":1,
                        "user.is_public":1,
                        "type":1,
                        "timeDiff":{ $subtract: [ "$$NOW", "$follow_time" ] } 
                    }
                },{ $sort: { follow_time: -1 } }]).exec((err,data)=>{
                    return res.status(200).json({"noti_data":data});
                });
        }
    });
});

// sign up user
router.route('/signup').post((req, res, next) => {
    user.find({'email':req.body.email},(error,data)=>{
        if(error){
            res.status(502).json({message: "error while creating user"});
        } else{
            if(data.length > 0)
                return res.status(404).json({message: "Already exist"});
            else {
                bcrypt.hash(req.body.password, 12, (err, passwordHash) => {
                    if(err){
                        return res.status(500).json({message: "could not hash the password"}); 
                    }
                    else if(passwordHash){
                        user.create({
                            email:req.body.email,
                            password:passwordHash,
                            name:req.body.capName,
                            follow_list:[
                                {
                                    'name':req.body.email,
                                    'new':false,
                                    'fdate':new Date(),
                                    'type':1
                                }
                            ]
                        }, (error, data) => {
                            if (error) {
                                res.status(502).json({message: "error while creating user"});
                            } else {
                                // res.status(200).json({message:"SignUp Success~!", "email":req.body.email})
                                const token = jwt.sign({ email: req.body.email }, 'secret');
                                res.status(200).json({message: "Welcome", "token": token, "user":{
                                    email:req.body.email,
                                    password:passwordHash,
                                    name:req.body.capName,
                                    photo:'',
                                    is_public:true,
                                    follow_list:[
                                        {
                                            'name':req.body.email,
                                            'new':false,
                                            'fdate':new Date(),
                                            'type':1
                                        }]
                                }});
                            }
                        })
                    }
                });
            }
        }
    });
});

//sign in user
router.route('/signin').post((req, res, next) => {
    user.find({'email':req.body.email},(error,data)=>{
        if(error){
            return res.status(404).json({message: "user not found"});
        } else{
            // password hash
            if(data.length == 0)
                return res.status(404).json({message: "user not found"});
            
            bcrypt.compare(req.body.password, data[0]['password'], (err, compareRes) => {
                if (err) { // error while comparing
                    res.status(502).json({message: "error while checking user password"});
                } else if (compareRes) { // password match
                    const token = jwt.sign({ email: req.body.email }, 'secret');
                    res.status(200).json({message: "Welcome", "token": token, "user":data[0]});
                    
                } else { // password doesnt match
                    res.status(401).json({message: "Wrong Password"});
                };
            });
        }
    });
});

//reset password by forgot
router.route('/reset_password').post((req, res, next) => {
    bcrypt.hash("123456", 12, (err, passwordHash) => {
        if(err){
            return res.status(500).json({message: "could not hash the password"}); 
        }
        else if(passwordHash){
            user.update({'email':req.body.email},{'password':passwordHash},(error,data)=>{
                if(error){
                    return res.status(404).json({message: "user not found"});
                } else{
                    if(data.n ==0)
                        return res.status(404).json({message: "user not found"});
                   return res.status(200).json({message:"success"});
                }
            });
        }
    });
});


// change password
router.route('/changePasswordUser').post((req, res, next) => {
    user.find({'email':req.body.email},["password"],(err,data)=>{
        if(err || data.length == 0) return res.status(404).json({message: "user not found"});

        bcrypt.compare(req.body.password, data[0]['password'], (err, compareRes) => {
            if (err) { // error while comparing
                res.status(502).json({message: "error while checking user password"});
            } else if (compareRes) { // password match
                bcrypt.hash(req.body.new_password, 12, (err, passwordHash) => {
                    if(err){
                        return res.status(500).json({message: "could not hash the password"}); 
                    }
                    else if(passwordHash){
                        user.update({'email':req.body.email},{'password':passwordHash},(error,data)=>{
                            if(error){
                                return res.status(404).json({message: "user not found"});
                            } else{
                                if(data.n ==0)
                                    return res.status(404).json({message: "user not found"});
                                return res.status(200).json({message:"success"});
                            }
                        });
                    }
                });
            } else { // password doesnt match
                res.status(401).json({message: "Wrong Password"});
            };
        });
    });
});

//get block list data
router.route('/getBlockList').post((req,res,next) => {
    user.aggregate([
        {
            $match: {
                email: req.body.email
            }
        },  {
            $lookup: {
                from: "users",
                localField: "block_list",
                foreignField: "email",
                as: "user"
            }
        }]).exec((err,data)=>{
            return res.status(200).json({"data":data});
        });
});

//update user photo
router.route('/update_photo').post((req, res, next) => {
    user.update({'email':req.body.name},{'photo':req.body.url},(error,data)=>{
        if(error){
            return res.status(404).json({message: "user not found"});
        } else{
            if(data.n == 0)
                return res.status(404).json({message: "user not found"});

            //update successed, then change new statuses of following me
            user.updateMany({'follow_list.name':req.body.name},{'$set':{'follow_list.$.new':true}},(error,data)=>{
                if(error)
                    return res.status(500).json({message: "error while updating photo"});
            });

            //reset reactions
            reaction.remove({'email':req.body.name},(error,data)=>{
                if(error)
                    return res.status(500).json({message: "error while reseting reactions"});
            })
            return res.status(200).json({message:"success"});
        }
    });
});

// set new status to false
router.route('/removeNewStatus').post((req,res,next) => {
    user.update({'email':req.body.email,'follow_list.name':req.body.follower},{'$set':{'follow_list.$.new':false}},(error,data)=>{
        if(error)
            return res.status(500).json({message: "error while updating photo"});
        return res.status(200).json({message:"success"});  
    });
});

//get reaction_history
router.route('/getReactionHistory').post((req,res,next) => {
    reaction.aggregate([
        {
            $match: {
                email: req.body.email
            }
        },
        {
            $group : {_id : {type:"$type" , react_email:"$react_email"},count:{$sum:1}}
        },  {
            $lookup: {
                from: "users",
                localField: "_id.react_email",
                foreignField: "email",
                as: "user"
            }
        },{ $sort: { count: -1 } }]).exec((err,data)=>{
            return res.status(200).json({"data":data});
        });
});


//get reaction_data
router.route('/getReaction').post((req,res,next) => {
    reaction.find({'email':req.body.email},(error,data)=>{
        if(error){
            return res.status(404).json({message: "user not found"});
        } else{
            let fUser = 0;
            let fCont = 0;
            flag_history.count({email:req.body.email,action_email:req.body.action_email,flag_type:1},(err,count)=>{
                fUser = count;
                flag_history.count({email:req.body.email,action_email:req.body.action_email,flag_type:2},(err,count)=>{
                    fCont = count;
                    return res.status(200).json({"data":data,"fUser":fUser,"fCont":fCont});
                }); 
            });
        }   
    });
});

//add reaction_data
router.route('/addReaction').post((req,res,next) => {
    reaction.create({
        email:req.body.email,
        react_email:req.body.react_email,
        type:req.body.type
    }, (error, data) => {
        if (error) {
            res.status(502).json({message: "error while creating user"});
        } else {
            res.status(200).json({message:"Add success~!"})
        }
    })
});

router.route('/get_users').post((req, res, next) => {
    
    user.aggregate([
        {
            $match: {
                email: { $in : req.body.follow_list}
            }
        },  {
            $lookup: {
                from: "reactions",
                localField: "email",
                foreignField: "email",
                as: "reaction"
            }
        }]).exec((err,data)=>{
            
            return res.status(200).json({"data":data});
        });
});

// //get followed user list
// router.route('/get_users').post((req, res, next) => {
//     // const follow_list = req.body;
//     let feed_list = [];
//     let count = 0;
//     user.find({'email':req.body.email},(error,data)=>{
//         if(error){
//             return res.status(404).json({message: "user not found"});
//         }
//         // return res.status(200).json({"feed_list":data}); 
//         const nowUser = data[0];
//         const follow_list = data[0].follow_list;
//         follow_list.forEach((item,key) => {
//             user.find({'email':item.name},(error,data)=>{
//                 if(error){
//                     return res.status(404).json({message: "user not found"});
//                 } else{
//                     feed_list[key] = {
//                         'photo':data[0].photo,
//                         'name':data[0].name,
//                         'email':item.name,
//                         'new':item.new,
//                         'is_public':data[0].is_public
//                     };
//                     count++;
//                 }
                
//                 if(count == follow_list.length )
//                 {
//                     res.status(200).json({"feed_list":feed_list,"user":nowUser});
//                 }
                    
//             });
//         });   
//     });

    
// });

//get whole user list
router.route('/getUserList').post((req, res, next) => {
    user.find({},['email','name','photo','is_public','follow_list','block_list'],(error,data)=>{
        if(error){
            return res.status(404).json({message: "user not found"});
        } else{
            return res.status(200).json({"data":data});
        }
            
    });
});

//get user info
router.route('/getUser').post((req, res, next) => {
    user.find({'email':req.body.email},['email','name','photo','is_public','follow_list','block_list'],(error,data)=>{
        if(error){
            return res.status(404).json({message: "user not found"});
        } else{
            return res.status(200).json({"data":data});
        }
            
    });
});
//get user info
router.route('/getUserFollowList').post((req, res, next) => {
    user.find({'email':req.body.email},['follow_list'],(error,data)=>{
        if(error){
            return res.status(404).json({message: "user not found"});
        } else{
            return res.status(200).json({"data":data});
        }
            
    });
});

// add follow user
router.route('/addFollowUser').post((req, res, next) => {
    user.update({email:req.body.email},{$push:{follow_list:{
        name : req.body.add_email,
        new : false,
        fdate : new Date(),
        type : req.body.add_type?1:0
    }}},(err,data) => {
        if(err){
            return res.status(404).json({message: "user not found"});
        } else{
            noti_table.create({
                email:req.body.add_email,
                follower_email:req.body.email,
                type:req.body.add_type?1:0,
                follow_time : new Date()
            }, (error, data) => {
                if (error) {
                    return res.status(502).json({message: "error while creating user"});
                } else {
                    user.findOneAndUpdate({email:req.body.add_email}, {$set:{"noti_status":true}},(err, data)=>{
                        if(err){
                            return res.status(404).json({message: "user not found"});
                        } else{
                            return res.status(200).json({message:"success"});
                        }
                    });
                }
            })
        }
    });
});

// unblock User
router.route('/unBlockUser').post((req, res, next) => {
    user.update({email:req.body.email},{$pull:{block_list:req.body.blocked_email}},(err,data) => {
        if(err){
            return res.status(404).json({message: "user not found"});
        } else{
            return res.status(200).json({message:"success"});
        }
    });
});

// remove follow user
router.route('/removeFollowUser').post((req, res, next) => {
    user.update({email:req.body.email},{$pull:{follow_list:{
        name : req.body.remove_email
    }}},(err,data) => {
        if(err){
            return res.status(404).json({message: "user not found"});
        } else{
            return res.status(200).json({message:"success"});
        }
    });
});

// save user profile
router.route('/saveUserProfile').post((req, res, next) => {
    user.findOneAndUpdate({email:req.body.email}, {$set:{"is_public":req.body.userType,"name":req.body.userName}},{new:true},(err, data)=>{
        if(err){
            return res.status(404).json({message: "user not found"});
        } else{
            return res.status(200).json({message:"success"});
        }
    });
});

// block user
router.route('/blockUser').post((req, res, next) => {
    user.update({email:req.body.email},{$pull:{follow_list:{
        name : req.body.blocked_email
    }},$push:{block_list:req.body.blocked_email}},(err,data) => {
        if(err){
            return res.status(404).json({message: "user not found"});
        } else{
            return res.status(200).json({message:"success"});
        }
    });
});

// remove user
router.route('/delUser').post((req, res, next) => {
    // remove user
    user.remove({email:req.body.email},(err,data)=>{
        if(err)
            return res.status(404).json({message:"cannot remove user"});
            
        user.updateMany({'follow_list.name':req.body.email},{$pull:{follow_list:{
            name : req.body.email
        }}},(err,data) => {
            if(err){
                return res.status(404).json({message: "user not found"});
            }
            user.updateMany({'block_list':req.body.email},{$pull:{block_list:req.body.email}},(err,data) => {
                if(err){
                    return res.status(404).json({message: "user not found"});
                }
                reaction.remove({$or:[{email:req.body.email},{react_email:req.body.email}]},(err,data)=>{
                    if(err)
                        return res.status(404).json({message:"cannot remove reaction"});
                     noti_table.remove({$or:[{email:req.body.email},{follower_email:req.body.email}]},(err,data)=>{
                        if(err)
                            return res.status(404).json({message:"cannot remove notification"});
                        return res.status(200).json({message:10});
                     });
                });
            });
        });
        
    });
});

//flag user
router.route('/flagUser').post((req, res, next) => {
    //check number 3?
    flag_history.count({email:req.body.email,flag_type:req.body.flag_type},(err,count)=>{
        if(count >= 2)
        {
            // remove user
            user.remove({email:req.body.email},(err,data)=>{
                if(err)
                    return res.status(404).json({message:"cannot remove user"});
                    
                user.updateMany({'follow_list.name':req.body.email},{$pull:{follow_list:{
                    name : req.body.email
                }}},(err,data) => {
                    if(err){
                        return res.status(404).json({message: "user not found"});
                    }
                    user.updateMany({'block_list':req.body.email},{$pull:{block_list:req.body.email}},(err,data) => {
                        if(err){
                            return res.status(404).json({message: "user not found"});
                        }
                        reaction.remove({$or:[{email:req.body.email},{react_email:req.body.email}]},(err,data)=>{
                            if(err)
                                return res.status(404).json({message:"cannot remove reaction"});
                            return res.status(200).json({message:10});
                        });
                    });
                });
                
            });
            
        }
        else{
            flag_history.create({
                email:req.body.email,
                action_email:req.body.action_email,
                flag_type:req.body.flag_type
            }, (error, data) => {
                if (error) {
                    res.status(502).json({message: "error while creating user"});
                } else {
                    res.status(200).json({message:1})
                }
            })
        }
    });

    
});

module.exports = router;