import { analyzeJournal, getInsight, getModelInfo } from '../lib/api';

export const MindfulAPI = {
  async analyzeJournal(text: string) {
    return analyzeJournal(text);
  },

  async getInsight(userId: string) {
    return getInsight(userId);
  },

  async getModelInfo(userId: string) {
    return getModelInfo(userId);
  },
};
