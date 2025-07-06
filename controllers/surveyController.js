const Survey = require('../models/Survey');
const cloudinary = require('../utils/cloudinary');
const mongoose = require('mongoose');
const SurveyResponse = require('../models/SurveyResponse')

// Create a new survey
exports.createSurvey = async (req, res) => {
  try {
    const createdBy = req.user.userId;

    const title = req.body.title;
    const description = req.body.description || '';
    const questions = req.body.questions ? JSON.parse(req.body.questions) : [];
    const introQuestions = req.body.introQuestions
      ? JSON.parse(req.body.introQuestions)
      : [];

    // Handle optional image
    let imageUrl = '';
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'surveys'
      });
      imageUrl = result.secure_url;
    }

    const survey = new Survey({
      title,
      description,
      createdBy,
      questions,
      introQuestions,
      imageUrl // ✅ Fix: this matches the schema
    });

    await survey.save();
    res.status(201).json(survey);
  } catch (error) {
    console.error("Error creating survey:", error.message);
    res.status(400).json({ message: error.message });
  }
};

// Get all surveys (for public or dashboard view)
exports.getAllSurveys = async (req, res) => {
  try {
    const surveys = await Survey.find()
      .populate('createdBy', 'username email')
      .select('-__v')
      .lean();

    const formatted = surveys.map(s => ({
      _id: s._id,
      title: s.title,
      description: s.description || '',
      imageUrl: s.imageUrl || '', // ✅ Fixed
      introQuestions: s.introQuestions || [],
      questions: s.questions || [],
      createdAt: s.createdAt,
      createdBy: s.createdBy || { username: 'Unknown' }
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching surveys', error: error.message });
  }
};
// Get one survey
exports.getSurvey = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id).populate('createdBy', 'username email');
    if (!survey) return res.status(404).json({ message: 'Survey not found' });

    res.json({ success: true, data: survey });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// controllers/surveyController.js
exports.getSurveysByCreator = async (req, res) => {
  try {
    const userId = req.user.userId; // from auth middleware

    const surveys = await Survey.find({ createdBy: userId }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: surveys });
  } catch (error) {
    console.error('Error fetching creator surveys:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update survey (only creator can update)
// PUT /surveys/:id — Update Survey
exports.updateSurvey = async (req, res) => {
  try {
    const { title, description } = req.body;

    // ✅ Parse arrays safely
    const questions = req.body.questions ? JSON.parse(req.body.questions) : undefined;
    const introQuestions = req.body.introQuestions ? JSON.parse(req.body.introQuestions) : undefined;

    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ message: 'Survey not found' });

    // ✅ Authorization check
    if (survey.createdBy.toString() !== req.user.userId)
      return res.status(403).json({ message: 'Not authorized' });

    // ✅ Update fields
    if (title) survey.title = title;
    if (description !== undefined) survey.description = description;
    if (questions) survey.questions = questions;
    if (introQuestions) survey.introQuestions = introQuestions;

    // ✅ Update image if a new one was uploaded
    if (req.file) {
      const newImageUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/${req.file.path}`;
      survey.imageUrl = newImageUrl;
    }

    await survey.save();
    res.json({ success: true, data: survey });
  } catch (error) {
    console.error('Survey update failed:', error);
    res.status(400).json({ message: error.message || 'Failed to update survey' });
  }
};


// DELETE /surveys/:id — Delete Survey
exports.deleteSurvey = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Deleting survey with ID:', id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid survey ID format' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const survey = await Survey.findById(id).session(session);
      console.log('Found survey:', survey);

      if (!survey) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, message: 'Survey not found' });
      }

      console.log('Request user:', req.user);
      console.log('Survey creator:', survey.createdBy.toString());

      if (survey.createdBy.toString() !== req.user.userId) {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({ success: false, message: 'Not authorized to delete this survey' });
      }

      console.log('Deleting responses...');
      await SurveyResponse.deleteMany({ surveyId: id }).session(session);

      console.log('Deleting survey...');
      await Survey.deleteOne({ _id: id }).session(session);

      await session.commitTransaction();
      session.endSession();

      console.log('Survey deleted successfully');
      res.status(200).json({ success: true, message: 'Survey and all its responses deleted successfully' });

    } catch (error) {
      console.error('Transaction error:', error);
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error deleting survey:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid survey ID' });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete survey',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
