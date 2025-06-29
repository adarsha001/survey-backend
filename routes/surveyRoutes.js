const express = require('express');
const router = express.Router();
const surveyController = require('../controllers/surveyController');
const authMiddleware = require('../middleware/authMiddleware');
const SurveyResponse = require('../models/SurveyResponse');
const Survey = require('../models/Survey');
const User = require('../models/User');
// routes/surveyRoutes.js


router.get('/response-stats', async (req, res) => {
  try {
    const responses = await SurveyResponse.find()
      .populate('responses.surveyId')
      .populate('userId'); // 👈 this will get user data

    const questionStats = {}; // { questionId: { questionText, options: { [option]: [usernames] } } }

    for (const response of responses) {
      const username = response.userId?.username || response.userId?.email || 'Unknown User';
      for (const r of response.responses) {
        const qId = r.questionId;
        const sId = r.surveyId;
        const answer = r.userAnswer;

        const survey = await Survey.findById(sId);
        const question = survey.questions.find(q => q._id.toString() === qId.toString());

        if (!question) continue;

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
router.get('/all-responses', async (req, res) => {
  console.log('👉 GET /surveys/all-responses hit');

  try {
    const responses = await SurveyResponse.find()
      .populate('userId', 'username email') // populate user's name & email
      .populate('responses.surveyId', 'title questions.questionText questions._id') // populate survey title and question text
      // Note: questionId is not a ref, we handle that manually below

    // Enhance response by injecting actual question text
    const enhanced = responses.map(resp => {
      const enhancedResponses = resp.responses.map(r => {
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
    });

    res.status(200).json({ success: true, data: enhanced });
  } catch (error) {
    console.error('❌ Error fetching survey responses:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  // Check if id is a valid ObjectId


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


router.post('/', authMiddleware, surveyController.createSurvey);
router.get('/', surveyController.getAllSurveys);
router.get('/:id', authMiddleware, surveyController.getSurvey);
router.put('/:id', authMiddleware, surveyController.updateSurvey);
router.delete('/:id', authMiddleware, surveyController.deleteSurvey);

// Submit survey responses (no correctness check)
router.post('/survey-responses', authMiddleware, async (req, res) => {
  try {
    const { responses } = req.body;
    const userId = req.user.userId; // ✅ from token

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
