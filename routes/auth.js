const express = require('express');
const User = require("../models/User")
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var fetchuser = require('../middleware/fetchuser');
const Project = require('../models/Project');
const Discussion = require('../models/Discussion');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'thisisprojectbuddy$';

//ROUTE: 1 Create a user uding post "api/auth/createuser". No login required.
router.post('/createuser', [
    body('username', 'Enter a valid name').isLength({ min: 1, max:30 }),
    body('email', 'Enter a valid Email Id').isEmail(),
    body('password', 'Passowrd must be atleast 8 characters').isLength({ min: 8 })
], async (req, res) => {
    let success = false;
    //If there are errors, return Bad request and errors.
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, errors: errors.array() });
    }
    //Check the user with this email already exists
    try {
        let user_name = await User.findOne({ username: req.body.username });
        let user = await User.findOne({ email: req.body.email });
        if (user) {
            success = false;
            return res.status(400).json({ success, error: "Sorry, this email is already registered!" })
        }
        if (user_name) {
            success = false;
            return res.status(400).json({ success, error: "Sorry, this username already taken!" })
        }

        //Creating a secured password
        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(req.body.password, salt);
        //Create a new user
        user = await User.create({
            username: req.body.username,
            email: req.body.email,
            password: secPass,
        });

        const data = {
            user: {
                id: user.id
            }
        }
        const authToken = jwt.sign(data, JWT_SECRET);
        success = true;
        res.json({ success, authToken })

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error!");
    }
})


//ROUTE: 2 Authenticate a user using a POST: "/api/auth/login ". No login required.
router.post('/login', [
    body('email', 'Enter a valid Email Id').isEmail(),
    body('password', 'Password can not be blank').exists()
], async (req, res) => {
    let success = false;
    //If there are errors, return Bad request and errors.
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            success = false;
            return res.status(400).json({ success, error: "Please try to login with correct credentials" })
        }
        const passwordCompare = await bcrypt.compare(password, user.password)
        if (!passwordCompare) {
            success = false;
            return res.status(400).json({ success, error: "Incorrect Password" })
        }
        const data = {
            user: {
                id: user.id
            }
        }
        const authToken = jwt.sign(data, JWT_SECRET);
        success = true;
        res.json({ success, authToken })


    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error!");
    }
})

//ROUTE 3 : Get logged in user information using GET: "/api/auth/getuser" . Login required.

router.get('/getuser', fetchuser, async (req, res) => {
    try {
        var userId = req.user.id;
        const user = await User.findById(userId).select("-password");
        res.json(user)
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error")
    }
})

//ROUTE 4 : Get User Information with user_id using GET: "/api/auth/getuserbyid" . No Login Required.

router.get('/getuserbyid/:id', async (req, res) => {
    try {
        var userId = req.params.id;
        const user = await User.findById(userId).select("-password");
        if (!user) { return res.status(404).send("Not found") }
        res.json(user)
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error")
    }

})


//ROUTE 5: Update user information using PUT "api/auth/updateuserinfo". Login required.
router.put('/updateuserinfo', fetchuser, [
    body('name', 'Enter a valid name').isLength({ min: 1, max:30 }),
    body('bio', 'Bio length is exceeding').isLength({ max:300 }),
    body('institute', 'Institute length is exceeding').isLength({ max:70 }),
], async (req, res) => {
    try {
        const { name, bio, skills, institute, profile_picture, role } = req.body;
        //Create a newproject object
        const newUserInfo = {};

        if (name) { newUserInfo.name = name };
        if (bio) { newUserInfo.bio = bio };
        if (skills) { newUserInfo.skills = skills };
        if (institute) { newUserInfo.institute = institute };
        if (profile_picture) { newUserInfo.profile_picture = profile_picture };
        if (role) { newUserInfo.role = role };

        //Get user id
        const user = await User.findByIdAndUpdate(req.user.id, { $set: newUserInfo }, { new: true })
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Internal Server Error!" });
    }

})

//ROUTE 6: Delete the user using PUT "api/auth/deleteuser". Login required.
router.delete('/deleteuser', fetchuser, async (req, res) => {
    try {
        // Find projects owned by the user
        const userProjects = await Project.find({ user: req.user.id });
        if (userProjects && userProjects.length > 0) {
            // Loop through each project and delete user-related dependencies
            for (const project of userProjects) {
                await Discussion.deleteMany({ project: project._id });
                await User.updateMany(
                    { 'joinedProjects.projectId': project._id },
                    { $pull: { joinedProjects: { projectId: project._id } } }
                );
                await Project.findByIdAndDelete(project._id);
            }
        }
        // Find projects related to team members or requests
        const teamProjects = await Project.find({ 'team_members': req.user.id });
        const requestProjects = await Project.find({ 'requests.userId': req.user.id });

        // Update team members and requests in other projects
        await Promise.all([
            Project.updateMany({ '_id': { $in: teamProjects.map(p => p._id) } }, { $pull: { team_members: req.user.id } }),
            Project.updateMany({ '_id': { $in: requestProjects.map(p => p._id) } }, { $pull: { 'requests': { userId: req.user.id } } })
        ]);

        const user = await User.findByIdAndDelete(req.user.id);
        
        res.json({ "Success": "User has been deleted" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error!");
    }
});


//ROUTE 7: Send join request to a project using POST "api/auth/sendjoinrequest". Login required.
router.post('/sendjoinrequest/:projectId', fetchuser, async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;

        // Check if the user making the request is the owner of the project
        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.user.toString() === userId) {
            return res.status(401).json({ message: 'Project owner cannot send a join request' });
        }


        // Check if the user has already sent a request to join this project
        const existingRequest = await User.findOne({
            _id: userId,
            'joinedProjects.projectId': projectId
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'You have already sent a request to join this project' });
        }

        // Update the project's requests
        await Project.findByIdAndUpdate(projectId, {
            $push: { requests: { userId, status: 'pending' } }
        });

        // Update the user's joinedProjects
        await User.findByIdAndUpdate(userId, {
            $push: { joinedProjects: { projectId, status: 'pending' } }
        });

        res.json({ message: 'Join request sent successfully' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
});





module.exports = router