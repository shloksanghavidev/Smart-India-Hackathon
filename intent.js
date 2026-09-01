/**
 * MediSarthi — Local NLP Intent Classification System
 * Matches user input (English, Hindi, Hinglish) to clinical symptom pathways.
 */

const IntentClassifier = {
  rules: [
    {
      intent: 'stomach_pain',
      label: 'Stomach Pain',
      keywords: [
        'stomach', 'pet', 'abdomen', 'belly', 'navel', 'gut', 'abdominal',
        'dard', 'pain', 'ache', 'hurting', 'cramp', 'gas', 'acid'
      ],
      // Required combination or strong phrase match
      phrases: [
        'stomach pain', 'stomach ache', 'pet me dard', 'pet mein dard',
        'abdominal pain', 'belly pain', 'stomach hurt', 'pet dukh raha hai',
        'pet me jalan', 'acid reflux', 'stomach hurting'
      ]
    },
    {
      intent: 'cough_cold',
      label: 'Cough / Cold',
      keywords: ['cough', 'cold', 'khansi', 'kuf', 'sardi', 'mucus', 'phlegm', 'throat', 'gala'],
      phrases: ['cough and cold', 'khansi aur sardi', 'coughing', 'gale me dard', 'dry cough', 'khansi hai']
    },
    {
      intent: 'fever',
      label: 'Fever',
      keywords: ['fever', 'bukhar', 'temp', 'temperature', 'chills', 'thand', 'pyrexia', 'garmi'],
      phrases: ['high fever', 'tez bukhar', 'bukhar hai', 'feeling feverish', 'body hot']
    },
    {
      intent: 'headache',
      label: 'Headache',
      keywords: ['headache', 'head', 'sir', 'sar', 'migraine', 'matha'],
      phrases: ['headache', 'sir me dard', 'sar dard', 'head hurting', 'migraine pain']
    },
    {
      intent: 'body_pain',
      label: 'Body Pain',
      keywords: ['body', 'back', 'joint', 'leg', 'arm', 'sharir', 'badan'],
      phrases: ['body pain', 'badan dard', 'back pain', 'joint pain', 'sharir me dard']
    }
  ],

  classify(inputStr) {
    if (!inputStr || typeof inputStr !== 'string') {
      return { intent: 'something_else', confidence: 0 };
    }

    const lower = inputStr.toLowerCase().trim();

    // 1. Check exact strong phrase match
    for (const rule of this.rules) {
      for (const phrase of rule.phrases) {
        if (lower.includes(phrase)) {
          return { intent: rule.intent, label: rule.label, confidence: 0.95, matched: phrase };
        }
      }
    }

    // 2. Keyword score matching
    let bestMatch = null;
    let maxScore = 0;

    for (const rule of this.rules) {
      let score = 0;
      for (const kw of rule.keywords) {
        if (lower.includes(kw)) {
          score += 1;
        }
      }
      if (score > maxScore) {
        maxScore = score;
        bestMatch = rule;
      }
    }

    if (bestMatch && maxScore > 0) {
      return { intent: bestMatch.intent, label: bestMatch.label, confidence: 0.7 + (maxScore * 0.1), matched: 'keywords' };
    }

    // 3. Fallback to Something Else
    return { intent: 'something_else', label: 'Something Else', confidence: 0.3 };
  }
};
