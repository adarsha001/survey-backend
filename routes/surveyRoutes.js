const express = require('express');
const router = express.Router();
const surveyController = require('../controllers/surveyController');
const authMiddleware = require('../middleware/authMiddleware');
const SurveyResponse = require('../models/SurveyResponse');
const Survey = require('../models/Survey');
const User = require('../models/User');

// Get survey statistics for surveys created by the logged-in user
router.get('/response-stats', authMiddleware, async (req, res) => {
  try {
    const creatorId = req.user.userId;

    const responses = await SurveyResponse.find()
      .populate('responses.surveyId')
      .populate('userId');

    const questionStats = {};

    for (const response of responses) {
      const username = response.userId?.username || response.userId?.email || 'Unknown User';

      for (const r of response.responses) {
        const survey = await Survey.findById(r.surveyId);

        if (!survey || survey.createdBy.toString() !== creatorId) {
          continue;
        }

        const question = survey.questions.find(q => q._id.toString() === r.questionId.toString());
        if (!question) continue;

        const qId = r.questionId;
        const answer = r.userAnswer;

        if (!questionStats[qId]) {
          questionStats[qId] = {
            questionText: question.questionText,
            answers: {}
          };
        }

        if (!questionStats[qId].answers[answer]) {
          questionStats[qId].answers[answer] = [];
        }

        questionStats[qId].answers[answer].push(username);
      }
    }

    res.json({ success: true, data: questionStats });

  } catch (err) {
    console.error('Error building stats:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all responses for surveys created by the logged-in user
router.get('/all-responses', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const responses = await SurveyResponse.find()
      .populate('userId', 'username email')
      .populate('responses.surveyId', 'title createdBy questions.questionText questions._id');

    const enhanced = responses
      .map(resp => {
        const filteredResponses = resp.responses.filter(r => {
          const survey = r.surveyId;
          return survey?.createdBy?.toString() === currentUserId;
        });

        if (filteredResponses.length === 0) return null;

        const enhancedResponses = filteredResponses.map(r => {
          const survey = r.surveyId;
          const question = survey?.questions?.find(q => q._id.toString() === r.questionId.toString());

          return {
            surveyTitle: survey?.title || '',
            questionText: question?.questionText || '',
            userAnswer: r.userAnswer,
            surveyId: survey?._id,
            questionId: r.questionId
          };
        });

        return {
          user: {
            id: resp.userId?._id,
            username: resp.userId?.username,
            email: resp.userId?.email
          },
          responses: enhancedResponses,
          submittedAt: resp.submittedAt
        };
      })
      .filter(Boolean);

    res.status(200).json({ success: true, data: enhanced });

  } catch (error) {
    console.error('Error fetching survey responses:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get survey by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const survey = await Survey.findById(id).populate('createdBy');
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }
    res.json(survey);
  } catch (err) {
    console.error('Error fetching survey by ID:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create survey
router.post('/', authMiddleware, surveyController.createSurvey);
router.get('/', surveyController.getAllSurveys);
router.get('/:id', authMiddleware, surveyController.getSurvey);
router.put('/:id', authMiddleware, surveyController.updateSurvey);
router.delete('/:id', authMiddleware, surveyController.deleteSurvey);

// Submit survey response
router.post('/survey-responses', authMiddleware, async (req, res) => {
  try {
    const { responses } = req.body;
    const userId = req.user.userId;

    if (!responses || !userId) {
      return res.status(400).json({ success: false, message: "Missing responses or userId" });
    }

    const allSurveys = await Survey.find();

    const validatedResponses = responses.map(({ surveyId, questionId, userAnswer }) => {
      const survey = allSurveys.find(q => q._id.toString() === surveyId);
      if (!survey) return null;

      const question = survey.questions.find(q => q._id.toString() === questionId);
      if (!question) return null;

      return { surveyId, questionId, userAnswer };
    });

    const filteredResponses = validatedResponses.filter(Boolean);

    const surveyResponse = new SurveyResponse({
      userId,
      responses: filteredResponses,
      submittedAt: new Date()
    });

    const saved = await surveyResponse.save();
    res.status(201).json({ success: true, data: saved });

  } catch (error) {
    console.error("Survey response error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
