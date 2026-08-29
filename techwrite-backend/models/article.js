const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  excerpt: { type: String },
  category: { type: String, required: true },
  image: { type: String, default: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=900&q=85' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  readTime: { type: String, default: '5 min read' },
  status: { 
    type: String, 
    enum: ['draft', 'review', 'changes', 'published', 'rejected'], 
    default: 'draft' 
  },
  views: { type: Number, default: 0 },
  adminFeedback: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Article', articleSchema);