/**
 * profanityFilter.js
 *
 * Reusable profanity-checking utility for F.E.A.S.T. web application.
 *
 * Uses the `bad-words-next` package with its default English profanity dictionary.
 * All checks are case-insensitive and trim leading/trailing whitespace
 * before evaluation.
 *
 * Usage:
 *   import { containsProfanity, checkFieldsForProfanity, PROFANITY_MESSAGE } from '../utils/profanityFilter';
 *
 *   if (checkFieldsForProfanity([title, description])) {
 *     showAlert(PROFANITY_MESSAGE);
 *     return;
 *   }
 */

import BadWordsNext from 'bad-words-next';
import en from 'bad-words-next/lib/en';

// Define a list of common Tagalog profanities
const tagalogWords = [
  'putangina',
  'putang ina',
  'tangina',
  'tang ina',
  'pota',
  'puta',
  'gago',
  'tarantado',
  'bobo',
  'ulol',
  'kupal',
  'puke',
  'tite',
  'salsal',
  'kantot',
  'pekpek',
  'hudas',
  'hayop',
  'leche',
  'lintek',
  'buwisit',
  'pakyu',
  'tanga',
  'ogag',
  'gaga'
];

// Initialize the filter with English language dictionary
const badwords = new BadWordsNext({ data: en });

// Add Tagalog profanities to the dictionary list
badwords.add({
  id: 'tl',
  words: tagalogWords
});

/**
 * Standard user-facing message displayed when profanity is detected.
 */
export const PROFANITY_MESSAGE =
  'Your request contains inappropriate language. Please remove any offensive words before submitting.';

/**
 * Check whether a single text string contains profanity.
 *
 * @param {string} text - The input text to evaluate.
 * @returns {boolean} `true` if the text contains profanity, `false` otherwise.
 */
export const containsProfanity = (text) => {
  if (!text || typeof text !== 'string') return false;
  return badwords.check(text.trim());
};

/**
 * Check whether ANY of the provided text fields contain profanity.
 *
 * @param {string[]} fields - An array of strings to evaluate.
 * @returns {boolean} `true` if at least one field contains profanity.
 */
export const checkFieldsForProfanity = (fields) => {
  if (!Array.isArray(fields)) return false;
  return fields.some((field) => containsProfanity(field));
};
