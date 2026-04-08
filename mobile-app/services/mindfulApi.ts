import { analyzeJournal, getInsight } from '../api';

export const MindfulAPI = {
  async analyzeJournal(text: string) {
    return analyzeJournal(text);
  },

  async getInsight(userId: string) {
    return getInsight(userId);
  },
};
