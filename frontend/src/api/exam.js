import apiClient from './axios';

/**
 * Starts a timed mock exam session for a target company.
 */
export const startExam = async (company, difficulty, count) => {
  const response = await apiClient.post('/api/exam/start', {
    company,
    difficulty,
    count
  });
  return response.data;
};

/**
 * Submits user answers for grading.
 * answers: Array of { questionId, userAnswer } or Map of { [questionId]: userAnswer }
 */
export const submitExam = async (examId, answers) => {
  const response = await apiClient.post(`/api/exam/submit/${examId}`, {
    answers
  });
  return response.data;
};

/**
 * Fetches the result and grading details of a completed exam session.
 */
export const getResult = async (examId) => {
  const response = await apiClient.get(`/api/exam/result/${examId}`);
  return response.data;
};
