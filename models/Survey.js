const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  questionType: {
    type: String,
    enum: ['radio', 'checkbox', 'text'],
    required: true
  },
  options: {
    type: [String],
    default: function () {
      return this.questionType === 'text' ? [] : ['Option 1', 'Option 2'];
    }
  }
});

const introQuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  fieldType: {
    type: String,
    enum: ['text', 'number', 'email', 'date', 'select'],
    required: true
  },
  options: { type: [String], default: [] },
  required: { type: Boolean, default: true }
});

const surveySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  introQuestions: [introQuestionSchema], // ✅ age, gender etc.
  questions: [questionSchema],
  imageUrl: { type: String },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'userschema',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Survey', surveySchema);
