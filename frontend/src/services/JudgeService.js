export const JudgeService = {
  /**
   * Simulates compiler validation output mimicking Judge0 API results.
   * @param {string} code - User typed code
   * @param {string} language - JavaScript, Python, etc.
   * @param {object} question - Question detail
   */
  validateSolution: async (code, language, question) => {
    return new Promise((resolve) => {
      let output = 'Connecting to isolated sandboxed environment...\n';
      output += 'Analyzing script syntax...\n';
      output += 'Running test case suite (12 assertions)...\n\n';

      setTimeout(() => {
        const cleanCode = (code || '').replace(/\s+/g, '').toLowerCase();

        // Heuristics for basic error checks
        if (cleanCode.length < 20) {
          resolve({
            status: 'failed',
            message: 'Compile Error: Solution too short or syntactically invalid.',
            logs: output + 'Error: Unexpected token or empty function body.'
          });
          return;
        }

        // Check if user solved a Bug Hunt bug
        let resolvedBug = false;
        if (question?.isBugHunt) {
          // Verify if they removed the bugs
          if (question.title.includes('Two Sum')) {
            // Fix was moving seen[n] = i to after the check
            const correctOrder = code.indexOf('seen[') > code.indexOf('target -');
            resolvedBug = correctOrder;
          } else if (question.title.includes('Binary Search')) {
            // Fix was low = mid + 1
            resolvedBug = code.includes('mid + 1');
          } else if (question.title.includes('Valid Parentheses')) {
            // Fix was stack.length === 0 and checking pop
            resolvedBug = code.includes('stack.length === 0') || code.includes('stack.length == 0');
          }
          
          if (resolvedBug) {
            output += 'Test case 1/12 passed...\n';
            output += 'Test case 6/12 passed...\n';
            output += 'Test case 12/12 passed...\n';
            output += '\nAll bug hunt test assertions resolved!';
            resolve({
              status: 'passed',
              message: 'Bug successfully patched!',
              logs: output
            });
            return;
          } else {
            output += 'Test case 1/12 passed...\n';
            output += 'Test case 4/12 failed (Infinite loop or wrong indexes).\n';
            output += 'AssertionError: Infinite recursion / incorrect return value detected.';
            resolve({
              status: 'failed',
              message: 'Bug still exists in code.',
              logs: output
            });
            return;
          }
        }

        // Standard 1v1 battle compile
        const isPassed = Math.random() < 0.75;
        if (isPassed) {
          output += 'Test case 1/12 passed...\n';
          output += 'Test case 5/12 passed...\n';
          output += 'Test case 9/12 passed...\n';
          output += 'Test case 12/12 passed...\n';
          output += '\nAll 12 test assertions resolved successfully!';
          resolve({
            status: 'passed',
            message: 'All test cases passed successfully!',
            logs: output
          });
        } else {
          output += 'Test case 1/12 passed...\n';
          output += 'Test case 4/12 passed...\n';
          output += 'Test case 5/12 failed!\n';
          output += 'AssertionError: Expected output 12, but evaluated -1.';
          resolve({
            status: 'failed',
            message: 'Assertion Failed: Error on test case 5/12.',
            logs: output
          });
        }
      }, 1500);
    });
  }
};
