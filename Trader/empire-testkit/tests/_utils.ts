import { requireEnv } from '../src/lib/env';
import { callEdge as _call } from './_utils/callEdge';

export const env = {
  supabaseUrl: requireEnv('supabaseUrl'),
  supabaseAnon: requireEnv('supabaseAnon'),
  wallet: process.env.TEST_WALLET || '27iC4pJHhc4ZnAsbmAPFHV6deWz3BWWqD9QFEJxoCun9',
};

export const callEdge = _call;
