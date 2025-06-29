// controllers/surveyController.js

const Survey = require('../models/Survey');

// Create a new survey (restricted to authenticated users)
exports.createSurvey = async (req, res) => {
  try {
    const { title, questions } = req.body;
    const createdBy = req.user.userId;

    const survey = new Survey({
      title,
      questions,
      createdBy
    });

    await survey.save();
    res.status(201).json(survey);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get a specific survey (public access)
exports.getSurvey = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id).populate('createdBy', 'name email');
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }
    res.json(survey);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all surveys (public access)
exports.getAllSurveys = async (req, res) => {
  try {
    const surveys = await Survey.find({})
      .select('-__v')
      .lean();

    const formattedSurveys = surveys.map(survey => ({
      _id: survey._id,
      title: survey.title,
      questions: survey.questions || [],
      createdAt: survey.createdAt,
      createdBy: survey.createdBy || { name: 'Unknown' }
    }));

    res.status(200).json(formattedSurveys);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching surveys',
      error: error.message 
    });
  }
};

// Update a survey (only by creator)
exports.updateSurvey = async (req, res) => {
  try {
    const { title, questions } = req.body;
    const survey = await Survey.findById(req.params.id);

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    if (survey.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    survey.title = title || survey.title;
    survey.questions = questions || survey.questions;

    await survey.save();
    res.json(survey);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a survey (only by creator)
exports.deleteSurvey = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    if (survey.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await survey.remove();
    res.json({ message: 'Survey deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
