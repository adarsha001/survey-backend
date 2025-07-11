const express = require('express');
const router = express.Router();
const surveyController = require('../controllers/surveyController');
const authMiddleware = require('../middleware/authMiddleware');
const SurveyResponse = require('../models/SurveyResponse');
const Survey = require('../models/Survey');
const User = require('../models/User');
const upload = require('../middleware/multer');
// routes/surveyRoutes.js


// routes/surveyRoutes.js (or similar file)
router.get('/response-stats', authMiddleware, async (req, res) => {
  try {
    const creatorId = req.user.userId;

    // Fetch all survey responses with related user and survey info
    const allResponses = await SurveyResponse.find()
      .populate('userId')
      .populate('responses.surveyId');

    const questionStats = {};

    for (const surveyResp of allResponses) {
      const username = surveyResp.userId?.username || surveyResp.userId?.email || 'Unknown User';

      for (const resp of surveyResp.responses) {
        const survey = resp.surveyId;
        if (!survey || survey.createdBy.toString() !== creatorId) continue;

        const question = survey.questions.find(
          q => q._id.toString() === resp.questionId.toString()
        );
        if (!question) continue;

        const qId = resp.questionId.toString();
        const answer = resp.userAnswer;

        questionStats[qId] = questionStats[qId] || {
          questionText: question.questionText,
          answers: {}
        };

        const recordAnswer = (ans) => {
          if (!questionStats[qId].answers[ans]) {
            questionStats[qId].answers[ans] = [];
          }
          questionStats[qId].answers[ans].push(username);
        };

        if (Array.isArray(answer)) {
          answer.forEach(recordAnswer);
        } else if (answer != null) {
          recordAnswer(answer);
        }
      }
    }

    return res.json({ success: true, data: questionStats });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});



router.get('/all-responses', authMiddleware, async (req, res) => {
  console.log('👉 GET /surveys/all-responses hit');

  try {
    const creatorId = req.user.userId;

    // First find all surveys created by this user
    const userSurveys = await Survey.find({ createdBy: creatorId }).select('_id title questions');

    // Extract survey IDs for filtering
    const surveyIds = userSurveys.map(s => s._id);

    // Then find responses that reference these surveys
    const responses = await SurveyResponse.find({
      'responses.surveyId': { $in: surveyIds }
    })
    .populate('userId', 'username email')
    .populate({
      path: 'responses.surveyId',
      select: 'title questions.questionText questions._id createdBy',
      match: { createdBy: creatorId } // Ensure we only populate surveys created by this user
    });

    const filtered = responses.map(resp => {
      // Filter out responses that don't belong to the user's surveys
      const enhancedResponses = resp.responses
        .filter(r => r.surveyId) // Only keep populated surveyIds
        .map(r => {
          const survey = userSurveys.find(s => s._id.equals(r.surveyId._id));
          if (!survey) return null;
          
          const question = survey.questions.find(q => q._id.equals(r.questionId));
          
          return {
            surveyTitle: survey.title || '',
            questionText: question?.questionText || '',
            userAnswer: r.userAnswer,
            surveyId: survey._id,
            questionId: r.questionId
          };
        })
        .filter(Boolean); // Remove any null entries

      return {
        user: {
          id: resp.userId?._id,
          username: resp.userId?.username,
          email: resp.userId?.email
        },
        introResponses: resp.introResponses || [],
        responses: enhancedResponses,
        submittedAt: resp.submittedAt
      };
    }).filter(item => item.responses.length > 0);

    res.status(200).json({ success: true, data: filtered });
  } catch (error) {
    console.error('❌ Error fetching survey responses:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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


router.post('/create-survey', authMiddleware, upload.single('image'), surveyController.createSurvey);
router.get('/', surveyController.getAllSurveys);
router.get('/:id', authMiddleware, surveyController.getSurvey);
router.get('/created-by/me', authMiddleware, surveyController.getSurveysByCreator);
router.put('/:id', authMiddleware, upload.single('image'), surveyController.updateSurvey);
router.delete('/:id', authMiddleware, surveyController.deleteSurvey);

/// Submit survey responses (with introQuestions support)
router.post('/survey-responses', authMiddleware, async (req, res) => {
  try {
    const { responses, introResponses } = req.body;
    const userId = req.user.userId;

    if (!responses || !userId) {
      return res.status(400).json({ success: false, message: "Missing responses or userId" });
    }

    // Get all surveys (or you can fetch only the one surveyId if you want)
    const allSurveys = await Survey.find();

    // Validate main survey responses
    const validatedResponses = responses.map(({ surveyId, questionId, userAnswer }) => {
      const survey = allSurveys.find(s => s._id.toString() === surveyId);
      if (!survey) return null;

      const question = survey.questions.find(q => q._id.toString() === questionId);
      if (!question) return null;

      return { surveyId, questionId, userAnswer };
    }).filter(Boolean);

    // ✅ Log introResponses for debugging
    console.log('Received introResponses:', introResponses);

    // Validate introResponses are in correct format
    const validatedIntro = Array.isArray(introResponses)
      ? introResponses.filter(r => r.questionText && r.answer !== undefined)
      : [];

    const surveyResponse = new SurveyResponse({
      userId,
      responses: validatedResponses,
      introResponses: validatedIntro,
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

module.exports = router;
