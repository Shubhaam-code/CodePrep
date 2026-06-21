const mongoose = require('mongoose');
const Question = require('../models/Question');

const richQuestions = [
  {
    title: 'Two Sum',
    difficulty: 'Easy',
    acceptance: '49.5%',
    leetcodeUrl: 'https://leetcode.com/problems/two-sum/',
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.',
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]',
        explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].'
      }
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.'
    ],
    starterCode: {
      javascript: 'function twoSum(nums, target) {\n    // Write your code here\n    return [];\n}',
      python: 'class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass',
      cpp: 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        return {};\n    }\n};',
      java: 'class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        return new int[0];\n    }\n}'
    },
    testCases: [
      { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]' },
      { input: '[3,2,4]\n6', expectedOutput: '[1,2]' }
    ],
    hiddenTestCases: [
      { input: '[3,3]\n6', expectedOutput: '[0,1]' },
      { input: '[2,5,5,11]\n10', expectedOutput: '[1,2]' },
      { input: '[1,5,9]\n10', expectedOutput: '[0,2]' }
    ]
  },
  {
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    acceptance: '41.0%',
    leetcodeUrl: 'https://leetcode.com/problems/valid-parentheses/',
    description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.',
    examples: [
      {
        input: 's = "()"',
        output: 'true',
        explanation: 'Simple valid pair.'
      },
      {
        input: 's = "()[]{}"',
        output: 'true',
        explanation: 'All brackets match correctly.'
      },
      {
        input: 's = "(]"',
        output: 'false',
        explanation: 'Opening round bracket matched with closing square bracket.'
      }
    ],
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only: "()[]{}"'
    ],
    starterCode: {
      javascript: 'function isValid(s) {\n    // Write your code here\n    return false;\n}',
      python: 'class Solution:\n    def isValid(self, s: str) -> bool:\n        pass',
      cpp: 'class Solution {\npublic:\n    bool isValid(string s) {\n        return false;\n    }\n};',
      java: 'class Solution {\n    public boolean isValid(String s) {\n        return false;\n    }\n}'
    },
    testCases: [
      { input: '"()"', expectedOutput: 'true' },
      { input: '"()[]{}"', expectedOutput: 'true' },
      { input: '"(]"', expectedOutput: 'false' }
    ],
    hiddenTestCases: [
      { input: '"([)]"', expectedOutput: 'false' },
      { input: '"{[]}"', expectedOutput: 'true' },
      { input: '"["', expectedOutput: 'false' }
    ]
  },
  {
    title: 'Binary Search',
    difficulty: 'Easy',
    acceptance: '56.3%',
    leetcodeUrl: 'https://leetcode.com/problems/binary-search/',
    description: 'Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return `-1`.\n\nYou must write an algorithm with `O(log n)` runtime complexity.',
    examples: [
      {
        input: 'nums = [-1,0,3,5,9,12], target = 9',
        output: '4',
        explanation: '9 exists in nums and its index is 4'
      },
      {
        input: 'nums = [-1,0,3,5,9,12], target = 2',
        output: '-1',
        explanation: '2 does not exist in nums so return -1'
      }
    ],
    constraints: [
      '1 <= nums.length <= 10^4',
      '-10^4 < nums[i], target < 10^4',
      'All the integers in nums are unique.',
      'nums is sorted in ascending order.'
    ],
    starterCode: {
      javascript: 'function search(nums, target) {\n    // Write your code here\n    return -1;\n}',
      python: 'class Solution:\n    def search(self, nums: List[int], target: int) -> int:\n        pass',
      cpp: 'class Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        return -1;\n    }\n};',
      java: 'class Solution {\n    public int search(int[] nums, int target) {\n        return -1;\n    }\n}'
    },
    testCases: [
      { input: '[-1,0,3,5,9,12]\n9', expectedOutput: '4' },
      { input: '[-1,0,3,5,9,12]\n2', expectedOutput: '-1' }
    ],
    hiddenTestCases: [
      { input: '[5]\n5', expectedOutput: '0' },
      { input: '[2,5]\n2', expectedOutput: '0' },
      { input: '[2,5]\n5', expectedOutput: '1' }
    ]
  },
  {
    title: 'Reverse Linked List',
    difficulty: 'Easy',
    acceptance: '73.2%',
    leetcodeUrl: 'https://leetcode.com/problems/reverse-linked-list/',
    description: 'Given the `head` of a singly linked list, reverse the list, and return the reversed list.',
    examples: [
      {
        input: 'head = [1,2,3,4,5]',
        output: '[5,4,3,2,1]',
        explanation: 'Reversed order of elements.'
      }
    ],
    constraints: [
      'The number of nodes in the list is the range [0, 5000].',
      '-5000 <= Node.val <= 5000'
    ],
    starterCode: {
      javascript: 'function reverseList(head) {\n    // Write your code here\n    return head;\n}',
      python: 'class Solution:\n    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:\n        pass',
      cpp: 'class Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        return head;\n    }\n};',
      java: 'class Solution {\n    public ListNode reverseList(ListNode head) {\n        return head;\n    }\n}'
    },
    testCases: [
      { input: '[1,2,3,4,5]', expectedOutput: '[5,4,3,2,1]' },
      { input: '[]', expectedOutput: '[]' }
    ],
    hiddenTestCases: [
      { input: '[1,2]', expectedOutput: '[2,1]' },
      { input: '[9]', expectedOutput: '[9]' }
    ]
  }
];

const enrichDatabase = async () => {
  try {
    console.log('--- ENRICHING QUESTIONS DATABASE ---');
    
    // 1. Seed or update specific rich questions
    for (const qData of richQuestions) {
      const updated = await Question.findOneAndUpdate(
        { title: qData.title },
        qData,
        { upsert: true, new: true }
      );
      console.log(`Enriched question: ${updated.title} (${updated.difficulty})`);
    }

    // 2. Scan all other questions that have missing fields, and populate clean placeholders
    const blankQuestions = await Question.find({
      $or: [
        { description: { $exists: false } },
        { description: '' }
      ]
    });

    console.log(`Found ${blankQuestions.length} questions without description. Seeding placeholders...`);

    for (const q of blankQuestions) {
      // Build dynamic placeholder metadata
      const titleLower = q.title.toLowerCase();
      
      const placeholders = {
        description: `Given a coding challenge titled "${q.title}", write an optimal algorithm to solve it.\n\nVerify logic constraints and run assertions to complete the challenge.`,
        examples: [
          {
            input: '/* Standard sample input */',
            output: '/* Expected sample output */',
            explanation: `Explanation for ${q.title} base assertion.`
          }
        ],
        constraints: [
          'Memory limit: 256MB',
          'Time limit: 2.00 seconds'
        ],
        starterCode: {
          javascript: `function solve(input) {\n    // Write your optimal solution for ${q.title} here\n    return input;\n}`,
          python: `class Solution:\n    def solve(self, input):\n        # Write your optimal solution for ${q.title} here\n        return input`,
          cpp: `class Solution {\npublic:\n    int solve(int input) {\n        // Write your optimal solution for ${q.title} here\n        return input;\n    }\n};`,
          java: `class Solution {\n    public int solve(int input) {\n        // Write your optimal solution for ${q.title} here\n        return input;\n    }\n}`
        },
        testCases: [
          { input: '1', expectedOutput: '1' }
        ],
        hiddenTestCases: [
          { input: '2', expectedOutput: '2' },
          { input: '3', expectedOutput: '3' }
        ]
      };

      await Question.findByIdAndUpdate(q._id, placeholders);
    }

    console.log('✅ QUESTION ENRICHMENT COMPLETE!');
  } catch (error) {
    console.error('❌ Question enrichment failed:', error.message);
  }
};

module.exports = enrichDatabase;
