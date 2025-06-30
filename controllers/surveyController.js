const Survey = require('../models/Survey');

// Create a new survey
exports.createSurvey = async (req, res) => {
  try {
    const { title, description, questions, introQuestions } = req.body;
    const createdBy = req.user.userId;

    const survey = new Survey({
      title,
      description,
      createdBy,
      questions,
      introQuestions
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
      mediaUrl: s.mediaUrl || '',
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

// Update survey (only creator can update)
exports.updateSurvey = async (req, res) => {
  try {
    const { title, description, mediaUrl, introQuestions, questions } = req.body;
    const survey = await Survey.findById(req.params.id);

    if (!survey) return res.status(404).json({ message: 'Survey not found' });
    if (survey.createdBy.toString() !== req.user.userId) return res.status(403).json({ message: 'Not authorized' });

    // Update fields
    survey.title = title || survey.title;
    survey.description = description ?? survey.description;
    survey.mediaUrl = mediaUrl ?? survey.mediaUrl;
    survey.introQuestions = introQuestions ?? survey.introQuestions;
    survey.questions = questions ?? survey.questions;

    await survey.save();
    res.json({ success: true, data: survey });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete survey
exports.deleteSurvey = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ message: 'Survey not found' });
    if (survey.createdBy.toString() !== req.user.userId) return res.status(403).json({ message: 'Not authorized' });

    await survey.remove();
    res.json({ success: true, message: 'Survey deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
