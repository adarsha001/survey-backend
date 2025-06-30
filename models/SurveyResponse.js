const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  surveyId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Survey' },
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userAnswer: mongoose.Schema.Types.Mixed // radio, checkbox, or text
});

// 👇 New: For intro questions (not linked to questionId)
const introResponseSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  fieldType: { type: String }, // text, number, etc. (optional)
  answer: mongoose.Schema.Types.Mixed
});

const surveyResponseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'userschema',
    required: true
  },
  introResponses: [introResponseSchema], // 👈 NEW
  responses: [responseSchema],
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SurveyResponse', surveyResponseSchema);
  