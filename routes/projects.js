const express = require('express');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const User = require('../models/User');
const discussionRoutes = require('./discussions'); // Import the discussion routes
const Discussion = require('../models/Discussion');
router.use('/discussion', discussionRoutes); // Use the discussion routes


//ROUTE 1: Get all the projects using GET "api/projects/fetchallprojects". Login not required.
router.get('/fetchallprojects', async (req, res) => {
    try {
        const projects = await Project.find();
        res.json(projects)
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error!");
    }
})

//ROUTE 2: Get my projects using GET "api/projects/fetchmyprojects". Login required.
router.get('/fetchmyprojects', fetchuser, async (req, res) => {
    try {
        const projects = await Project.find({ user: req.user.id });
        res.json(projects)
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error!");
    }
})

//ROUTE 3 : Get User Information with user_id using GET: "/api/auth/getuserbyid" . No Login Required.

router.get('/getprojectbyid/:id', async (req, res) => {
    try {
        var projectId = req.params.id;
        const project = await Project.findById(projectId);
        if (!project){ return res.status(404).send("Not found")}
        res.json(project)
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error")
    }

})

//ROUTE 4: Add the new Project using POST "api/project/addproject". Login required.
router.post('/addproject', fetchuser, [
    body('title', 'Enter a title between 1 and 100 characters').isLength({ min: 1, max: 100}),
    body('description', 'Description must be between 1 and 500 characters').isLength({ min: 1, max: 500 }),
    body('category', 'Category is exceeding the word limit').isLength({max:60})
], async (req, res) => {
    try {
        const { title, description, category, members_no, weeks, open_closed, status, skills_required, repository_link } = req.body;
        //If there are errors, return Bad request and errors.
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const project = new Project({
            title: title, description: description, category: category, members_no: members_no, weeks: weeks, open_closed: open_closed, status: status, skills_required: skills_required, repository_link: repository_link, user: req.user.id, team_members: [req.user.id]
        })
        const savedProject = await project.save()

        res.json(savedProject)

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error!");
    }
})


//ROUTE 5: Update the project using PUT "api/project/updateproject". Login required.
router.put('/updateproject/:id', fetchuser, [
    body('title', 'Enter a title between 1 and 100 characters').isLength({ min: 1, max: 100}),
    body('description', 'Description must be between 1 and 500 characters').isLength({ min: 1, max: 500 }),
    body('category', 'Category is exceeding the word limit').isLength({min:60})
], async (req, res) => {
    try {
        const { title, description, category, members_no, weeks, open_closed, status, skills_required, repository_link } = req.body;
        //Create a newproject object
        const newProject = {};
        if (title) { newProject.title = title };
        if (description) { newProject.description = description };
        if (category) { newProject.category = category };
        if (members_no) { newProject.members_no = members_no };
        if (weeks) { newProject.weeks = weeks };
        if (open_closed) { newProject.open_closed = open_closed };
        if (status) { newProject.status = status };
        if (skills_required) { newProject.skills_required = skills_required};
        if (repository_link) { newProject.repository_link = repository_link};


        //Find the project to be updated and update it
        let project = await Project.findById(req.params.id);

        if (!project) { return res.status(404).send("Not found") }

        if (project.user.toString() !== req.user.id) {
            return res.status(401).send("Not allowed");
        }
        project = await Project.findByIdAndUpdate(req.params.id, { $set: newProject }, { new: true })
        res.json({ project });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error!");
    }

})

//ROUTE 6: Delete the project using PUT "api/project/deleteproject". Login required.
router.delete('/deleteproject/:id', fetchuser, async (req, res) => {
    try {
        //Find the project to be deleted and delete it
        let project = await Project.findById(req.params.id);
        if (!project) { return res.status(404).send("Not found") }
        //Allow deletion only if user owns this project
        if (project.user.toString() !== req.user.id) {
            return res.status(401).send("Not allowed");
        }
        // Delete discussions related to the project
        await Discussion.deleteMany({ project: req.params.id });

        // Remove team members who joined this project
        await User.updateMany(
            { 'joinedProjects.projectId': req.params.id },
            { $pull: { joinedProjects: { projectId: req.params.id } } }
        );

        // Delete the project
        project = await Project.findByIdAndDelete(req.params.id)
        res.json({ "Success": "Project has been deleted", note: note });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error!");
    }
})



// ROUTE 7: Accept or Reject join request using POST "api/projects/respondtojoinrequest/:projectId/:userId". Login required.
router.post('/respondtojoinrequest/:projectId/:userId', fetchuser, async (req, res) => {
    try {
        const { projectId, userId } = req.params;
        const { response } = req.body; // 'accepted' or 'rejected'

        // Find the project
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Find the user requesting to join
        const requestingUser = await User.findById(userId);
        if (!requestingUser) {
            return res.status(404).json({ message: 'User not found' });
        }


        // Check if the user has a pending join request for this project
        const joinRequestIndex = project.requests.findIndex(request => request.userId.toString() === userId && request.status === 'pending');
        if (joinRequestIndex === -1) {
            return res.status(404).json({ message: 'No pending join request found' });
        }

        // Update the project and user based on the response
        if (response === 'accepted') {
            // Check if adding the user will exceed the maximum number of members
            if (project.team_members.length < project.members_no) {
                // Add the user to the team members
                project.team_members.push(userId);
                // Remove the join request from the project
                project.requests.splice(joinRequestIndex, 1);
                // Update the user's joinedProjects status to 'accepted'
                requestingUser.joinedProjects.find(request => request.projectId.toString() === projectId).status = 'accepted';

                await project.save();
                await requestingUser.save();

                return res.json({ message: 'Join request accepted successfully' });
            } else {
                return res.json({ message: 'Project has reached the maximum number of members' });
            }
        } else if (response === 'rejected') {
            // Remove the join request from the project
            project.requests.splice(joinRequestIndex, 1);
            // Remove the requested Project from user's joinedProjects
            requestingUser.joinedProjects = requestingUser.joinedProjects.filter(request => request.projectId.toString() !== projectId);

            await project.save();
            await requestingUser.save();

            return res.json({ message: 'Join request rejected successfully' });
        } else {
            return res.status(400).json({ message: 'Invalid response. Use "accepted" or "rejected"' });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
});



module.exports = router