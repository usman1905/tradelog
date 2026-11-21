import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false }
  },
  { timestamps: true }
);

userSchema.methods.checkPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = password => bcrypt.hash(password, 12);

userSchema.set('toJSON', {
  transform: (_doc, ret) => ({ id: String(ret._id), name: ret.name, email: ret.email, createdAt: ret.createdAt })
});

export const User = mongoose.model('User', userSchema);
