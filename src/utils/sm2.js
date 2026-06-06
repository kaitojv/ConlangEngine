// src/utils/sm2.js

/**
 * SuperMemo-2 (SM-2) Spaced Repetition Algorithm
 * 
 * Maps 4 standard buttons to SM-2 grades:
 * Fail = 1
 * Hard = 3
 * Good = 4
 * Easy = 5
 * 
 * @param {number} grade - Grade from 0 to 5
 * @param {object} srsData - Previous SRS data { interval, repetition, easeFactor }
 * @returns {object} New SRS data { interval, repetition, easeFactor, nextReviewDate }
 */
export function calculateSM2(grade, srsData = {}) {
    let { interval = 0, repetition = 0, easeFactor = 2.5 } = srsData;

    if (grade >= 3) {
        if (repetition === 0) {
            interval = 1;
        } else if (repetition === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * easeFactor);
        }
        repetition += 1;
    } else {
        repetition = 0;
        interval = 1;
    }

    easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    if (easeFactor < 1.3) {
        easeFactor = 1.3;
    }

    // Calculate next review date (in milliseconds)
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const nextReviewDate = Date.now() + (interval * ONE_DAY);

    return {
        interval,
        repetition,
        easeFactor,
        nextReviewDate
    };
}
