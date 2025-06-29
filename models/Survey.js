// models/Survey.js
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  questionType: {
    type: String,
    enum: ['radio', 'checkbox', 'text'],
    required: true
  },
  options: {
    type: [String], // ✅ Now options are an array of strings
    default: function () {
      return this.questionType === 'text' ? [] : ['Option 1', 'Option 2'];
    }
  }
});

const surveySchema = new mongoose.Schema({
  title: { type: String, required: true },
  questions: [questionSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Survey', surveySchema);
