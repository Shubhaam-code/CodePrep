import apiClient from './axios';

/**
 * Fetches today's daily coding challenge.
 */
export const getDailyQuestion = async () => {
  const response = await apiClient.get('/api/playground/daily');
  return response.data;
};

/**
 * Submits the code solution for today's daily question.
 */
export const submitDailyQuestion = async (questionId, code, language) => {
  const response = await apiClient.post('/api/playground/daily/solve', {
    code,
    language
  });
  return response.data;
};

/**
 * Fetches a random DSA question, optionally filtered by difficulty.
 */
export const getRandomQuestion = async (difficulty) => {
  let url = '/api/playground/random';
  if (difficulty && difficulty !== 'All') {
    url += `?difficulty=${difficulty}`;
  }
  const response = await apiClient.get(url);
  return response.data;
};

/**
 * Submits code solution for a standard non-daily sandbox problem.
 */
export const submitSolution = async (questionId, code, language) => {
  const response = await apiClient.post('/api/playground/submit', {
    questionId,
    code,
    language
  });
  return response.data;
};

/**
 * Fetches user submissions history.
 */
export const getSubmissions = async () => {
  const response = await apiClient.get('/api/playground/submissions');
  return response.data;
};
