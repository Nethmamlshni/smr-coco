import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  username: string;
  password_hash: string;
  full_name: string;
  role: 'admin' | 'supervisor';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true, trim: true },
  password_hash: { type: String, required: true },
  full_name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'supervisor'], default: 'supervisor' },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export interface ISection extends Document {
  name: string;
  section_type: 'CNO' | 'VCO';
  cage_count: number;
  buttons_per_cage: number;
  is_active: boolean;
  display_order: number;
  created_at: Date;
}

const SectionSchema = new Schema<ISection>({
  name: { type: String, required: true },
  section_type: { type: String, enum: ['CNO', 'VCO'], required: true },
  cage_count: { type: Number, required: true, default: 15 },
  buttons_per_cage: { type: Number, required: true, default: 24 },
  is_active: { type: Boolean, default: true },
  display_order: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
});

export const Section: Model<ISection> = mongoose.models.Section || mongoose.model<ISection>('Section', SectionSchema);

export interface IProductionSession extends Document {
  supervisor_id: string;
  section_id: string;
  filling_type: 'full' | 'additional';
  shift: 'day' | 'night';
  production_date: string;
  is_submitted: boolean;
  submitted_at?: Date;
  created_at: Date;
}

const ProductionSessionSchema = new Schema<IProductionSession>({
  supervisor_id: { type: String, required: true },
  section_id: { type: String, required: true },
  filling_type: { type: String, enum: ['full', 'additional'], required: true },
  shift: { type: String, enum: ['day', 'night'], required: true },
  production_date: { type: String, required: true },
  is_submitted: { type: Boolean, default: false },
  submitted_at: { type: Date },
  created_at: { type: Date, default: Date.now },
});

export const ProductionSession: Model<IProductionSession> = mongoose.models.ProductionSession || mongoose.model<IProductionSession>('ProductionSession', ProductionSessionSchema);

export interface ICageRecord extends Document {
  session_id: string;
  cage_number: number;
  employee_name: string;
  contractor_name: string;
  raw_weight?: number;
  coconut_type?: 'Red' | 'Black' | 'Small';
  final_weight?: number;
  coconut_count: number;
  buttons_completed: number;
  is_completed: boolean;
  production_date: string;
  section_id: string;
  filling_type: 'full' | 'additional';
  shift: string;
  supervisor_id: string;
  created_at: Date;
  updated_at: Date;
}

const CageRecordSchema = new Schema<ICageRecord>({
  session_id: { type: String, required: true },
  cage_number: { type: Number, required: true },
  employee_name: { type: String},
  contractor_name: { type: String, required: true },
  raw_weight: Number,
  coconut_type: { type: String, enum: ['Red', 'Black', 'Small'] },
  final_weight: Number,
  coconut_count: { type: Number, default: 0 },
  buttons_completed: { type: Number, default: 0 },
  is_completed: { type: Boolean, default: false },
  production_date: { type: String, required: true },
  section_id: { type: String, required: true },
  filling_type: { type: String, enum: ['full', 'additional'], required: true },
  shift: { type: String, required: true },
  supervisor_id: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export const CageRecord: Model<ICageRecord> = mongoose.models.CageRecord || mongoose.model<ICageRecord>('CageRecord', CageRecordSchema);
