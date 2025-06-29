const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  surveyId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Survey' },
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userAnswer: mongoose.Schema.Types.Mixed // can be string, array (checkbox), or text
});

const surveyResponseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'userschema', required: true }, // ✅ FIXED HERE
  responses: [responseSchema],
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SurveyResponse', surveyResponseSchema);
