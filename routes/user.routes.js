let bcrypt = require('bcryptjs');

let jwt = require('jsonwebtoken');
let mongoose = require('mongoose'),
    express = require('express'),
    router = express.Router();

let user = require('../models/user-schema');
let reaction = require('../models/reaction-schema');

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
                            name:req.body.name,
                            follow_list:[{'name':req.body.email,'new':false}]
                        }, (error, data) => {
                            if (error) {
                                res.status(502).json({message: "error while creating user"});
                            } else {
                                res.status(200).json({message:"SignUp Success~!", "email":req.body.email})
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
    bcrypt.hash("PikselParty", 12, (err, passwordHash) => {
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
                    return res.status(500).json({message: "error while change new status"});
                console.log("change_new",data);
            });
            return res.status(200).json({message:"success"});
        }
    });
});

//get profile_data
router.route('/get_profile_data').post((req,res,next) => {
    reaction.find({'email':req.body.email},(error,data)=>{
        if(error){
            return res.status(404).json({message: "user not found"});
        } else{
           console.log("get_reaction_data",data);
           res.status(200).json({"data":data});
        }   
    });
});

//get followed user list
router.route('/get_users').post((req, res, next) => {
    const follow_list = req.body;
    let feed_list = [];
    let count = 0;
    follow_list.forEach((item,key) => {
        user.find({'email':item.name},(error,data)=>{
            if(error){
                return res.status(404).json({message: "user not found"});
            } else if(data.length == 0)
            {
                return res.status(404).json({message: "user not found"});
            } else{
                feed_list[key] = {
                    'photo':data[0].photo,
                    'name':data[0].name,
                    'email':data[0].email,
                    'new':item.new
                };
                count++;
            }
            
            if(count == follow_list.length )
            {
                res.status(200).json({"feed_list":feed_list});
            }
                
        });
    });

    
});

module.exports = router;