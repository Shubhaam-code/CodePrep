import apiClient from '../api/axios';

export const QuestionService = {
  /**
   * Fetches a random DSA question from the seeded database.
   * @param {string} difficulty - Easy, Medium, or Hard
   */
  getRandomQuestion: async (difficulty = 'Medium') => {
    try {
      let url = '/api/playground/random';
      if (difficulty && difficulty !== 'All') {
        url += `?difficulty=${difficulty}`;
      }
      const response = await apiClient.get(url);
      return response.data;
    } catch (err) {
      console.error('Error fetching random question:', err);
      // Fallback local question mock to ensure offline/fail-safe resilience
      return {
        _id: 'fallback_two_sum',
        title: 'Two Sum',
        difficulty: 'Easy',
        acceptance: '49.5%',
        leetcodeUrl: 'https://leetcode.com/problems/two-sum/',
        description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.'
      };
    }
  }
};
