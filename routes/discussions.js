// routes/discussion.js
const express = require('express');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser');
const Discussion = require('../models/Discussion');
const Project = require('../models/Project');


//ROUTE 1 : Route to get discussions for a project
router.get('/getdiscussions/:projectId', fetchuser, async (req, res) => {
  try {
    const { projectId } = req.params;
    const discussions = await Discussion.find({ project: projectId }).populate('user', 'name');
    res.json(discussions);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error!');
  }
});

// ROUTE 2 : Route to add a new discussion message
router.post('/adddiscussion/:projectId', fetchuser, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message } = req.body;

    const discussion = new Discussion({
      project: projectId,
      user: req.user.id,
      message
    });

    await discussion.save();

    //Update the project with the new discussion
    await Project.findByIdAndUpdate(projectId, { $push: { discussions: discussion.id } });

    res.json(discussion);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error!');
  }
});

module.exports = router;
