/**
 * MediSarthi — Robust Local NLP Intent Classification & Entity Extraction Engine
 * Matches user voice & text (Hindi, English, Hinglish, Bengali, Marathi, Telugu)
 * to clinical pathways, and extracts clinical entities (duration, location, severity, AYUSH sleep).
 */

const IntentClassifier = {
  rules: [
    {
      intent: 'headache',
      label: 'Headache',
      keywords: [
        'headache', 'head', 'sir', 'sar', 'saar', 'seer', 'migraine', 'matha',
        'mastika', 'sirdard', 'sardard', 'सिर', 'सिरदर्द', 'माथा', 'डोके', 'dokhe', 'dokhedukhi'
      ],
      phrases: [
        'headache', 'head pain', 'head hurting', 'migraine', 'severe headache',
        'sir me dard', 'sir mein dard', 'sar dard', 'sar mein dard',
        'saar me dard', 'saar mein dard', 'sir me dard hai', 'sir mein dard hai',
        'sar me dard hai', 'sar mein dard hai', 'sir mein dard ho raha hai',
        'sar mein dard ho raha hai', 'sir me dard ho raha hai',
        'mere sir mein bahut dard hai', 'mere sir mein dard hai',
        'mere sar mein dard hai', 'mere sar mein bahut dard ho raha hai',
        'mujhe sir mein dard', 'mujhe sir mein dard hai',
        'mujhe sar dard hai', 'mujhe sar mein dard hai',
        'sir dard ho raha hai', 'sar dard ho raha hai',
        'मुझे सिर में दर्द है', 'सिर में दर्द', 'सिरदर्द है', 'सिर में दर्द है',
        'dokhedukhi', 'mala dokhe dukhtey', 'dokhe dard', 'matha dard'
      ]
    },
    {
      intent: 'fever',
      label: 'Fever',
      keywords: [
        'fever', 'bukhar', 'bukhaar', 'bhukar', 'buhkar', 'temp', 'temperature', 'pyrexia',
        'garmi', 'tez', 'tapman', 'jwara', 'jwar', 'बुखार', 'ताप', 'ज्वर',
        'tapi', 'tapp'
      ],
      phrases: [
        'fever', 'high fever', 'tez bukhar', 'bukhar hai', 'bukhaar hai',
        'mujhe bukhar', 'mujhe bukhar hai', 'mujhe bukhaar hai',
        'mujhe bhukar hai', 'bhukar hai', 'buhkar hai',
        'bukhar ho raha hai', 'bhukar ho raha hai',
        'feeling feverish', 'body hot', 'temperature hai',
        'mujhe fever hai', 'fever hai', 'kal se bukhar hai', 'bahut tez bukhar hai',
        'मुझे बुखार है', 'बुखार है', 'बुखार हो रहा है', 'मुझे fever है',
        'बहुत तेज़ बुखार है', 'कल से बुखार है', 'तेज़ बुखार है',
        'mala tap', 'mala tapi', 'tapi ahe',
        'amar jor', 'jor ache'
      ]
    },
    {
      intent: 'cough_cold',
      label: 'Cough / Cold',
      keywords: [
        'cough', 'cold', 'khansi', 'khaansi', 'khanasi', 'khasi', 'kansi', 'sardi', 'mucus',
        'phlegm', 'throat', 'gala', 'kuf', 'खांसी', 'खाँसी',
        'सर्दी', 'जुकाम', 'jukhaam', 'jukam', 'khokla', 'khokala'
      ],
      phrases: [
        'cough', 'cold', 'cough and cold', 'khansi hai', 'khaansi hai',
        'mujhe khansi', 'mujhe khansi hai', 'mujhe khaansi hai',
        'khansi ho rahi hai', 'khaansi ho rahi hai',
        'mujhe khansi ho rahi hai', 'mujhe khaansi ho rahi hai',
        'gale mein kharaash', 'gale me dard', 'gale mein dard',
        'sardi hai', 'sardi ho gayi', 'dry cough', 'sukhi khansi', 'khansi aur sardi',
        'खांसी है', 'खाँसी है', 'मुझे खांसी है', 'मुझे खाँसी है',
        'खाँसी हो रही है', 'खांसी हो रही है', 'मुझे खांसी हो रही है',
        'mala khokla', 'khokla aahe', 'sardi khokla',
        'ami khusi', 'kosher'
      ]
    },
    {
      intent: 'stomach_pain',
      label: 'Stomach Pain',
      keywords: [
        'stomach', 'pet', 'pait', 'pote', 'abdomen', 'belly', 'navel', 'gut', 'abdominal',
        'dard', 'pain', 'ache', 'hurting', 'cramp', 'gas', 'acid',
        'पेट', 'उदर', 'पेटदर्द', 'pota', 'potat', 'उल्टी'
      ],
      phrases: [
        'stomach pain', 'stomach ache', 'stomach hurt', 'stomach hurting',
        'my stomach hurts', 'abdominal pain', 'belly pain', 'acid reflux',
        'pet me dard', 'pet mein dard', 'pet dard', 'pet dukh raha hai',
        'pet me jalan', 'mujhe pet mein dard', 'mujhe pet mein dard hai',
        'mujhe pet dard hai', 'mere pet mein bahut dard ho raha hai',
        'pet dard ho raha hai', 'pet me takleef',
        'kal se pet me dard', 'upar pet me dard',
        'मुझे पेट में दर्द है', 'पेट में दर्द', 'पेट दर्द है', 'पेट में दर्द हो रहा है',
        'पेट में बहुत दर्द है', 'ऊपर पेट में दर्द', 'कल से पेट में दर्द',
        'poti dukhto', 'potat dukhtey', 'pota dard',
        'pet phula', 'gas hai', 'gas ban rahi hai'
      ]
    },
    {
      intent: 'body_pain',
      label: 'Body Pain',
      keywords: [
        'body', 'back', 'joint', 'leg', 'arm', 'sharir', 'badan', 'shareer', 'sareer',
        'poora', 'muscle', 'शरीर', 'बदन', 'anga', 'angas'
      ],
      phrases: [
        'body pain', 'badan dard', 'back pain', 'joint pain', 'i have body pain',
        'sharir me dard', 'sharir mein dard', 'shareer mein dard',
        'poore sharir mein dard', 'poore badan mein dard',
        'mere sharir mein dard hai', 'mere poore sharir mein dard hai',
        'sharir mein dard ho raha hai', 'badan dard ho raha hai',
        'मुझे शरीर में दर्द है', 'शरीर में दर्द', 'बदन दर्द', 'शरीर में दर्द है',
        'anga dukhtey', 'pura angas dukhto',
        'sab jagah dard', 'pure badan mein dard'
      ]
    }
  ],

  /**
   * Speech & text spelling normalization.
   */
  normalize(str) {
    if (!str || typeof str !== 'string') return '';
    let s = str.toLowerCase().trim();

    // Remove punctuation & extra whitespace
    s = s.replace(/[।,\.!?;:'"]/g, ' ').replace(/\s+/g, ' ').trim();

    // Phonetic speech recognition misspellings mapping
    s = s.replace(/\bbhukar\b/g, 'bukhar');
    s = s.replace(/\bbukhaar\b/g, 'bukhar');
    s = s.replace(/\bbuhkar\b/g, 'bukhar');
    s = s.replace(/\bsaar\b/g, 'sir');
    s = s.replace(/\bseer\b/g, 'sir');
    s = s.replace(/\bkhaansi\b/g, 'khansi');
    s = s.replace(/\bkhasi\b/g, 'khansi');
    s = s.replace(/\bkansi\b/g, 'khansi');
    s = s.replace(/\bpait\b/g, 'pet');
    s = s.replace(/\bshareer\b/g, 'sharir');
    s = s.replace(/\bsareer\b/g, 'sharir');

    return s;
  },

  /**
   * Classify a single best-match intent.
   * Handles compound multi-symptom statements like "सर दर्द और बुखार दोनों हैं".
   */
  classify(inputStr) {
    const results = this.classifyMultiple(inputStr);
    if (results.length === 0) return { intent: 'something_else', label: 'Something Else', confidence: 0.3 };
    
    // Check for compound statements: "सर दर्द और बुखार दोनों हैं"
    const norm = this.normalize(inputStr);
    if (norm.includes('aur') || norm.includes('dono') || norm.includes('दोनों') || norm.includes('and')) {
      if (results.length > 1) {
        return {
          intent: results[0].intent,
          label: results[0].label,
          confidence: results[0].confidence,
          associatedIntent: results[1].intent,
          associatedLabel: results[1].label
        };
      }
    }
    return results[0];
  },

  /**
   * Classify and return ALL matched intents.
   */
  classifyMultiple(inputStr) {
    if (!inputStr || typeof inputStr !== 'string') return [];

    const lower = this.normalize(inputStr);
    const matches = [];

    for (const rule of this.rules) {
      let confidence = 0;
      let matched = null;

      // 1. Exact or partial phrase match
      for (const phrase of rule.phrases) {
        const normPhrase = this.normalize(phrase);
        if (lower.includes(normPhrase)) {
          confidence = Math.max(confidence, 0.95);
          matched = phrase;
          break;
        }
      }

      // 2. Keyword matching fallback
      if (confidence < 0.9) {
        let score = 0;
        for (const kw of rule.keywords) {
          const normKw = this.normalize(kw);
          if (lower.includes(normKw)) {
            score++;
          }
        }
        if (score > 0) {
          const kwConfidence = Math.min(0.55 + (score * 0.15), 0.88);
          if (kwConfidence > confidence) {
            confidence = kwConfidence;
            matched = 'keywords';
          }
        }
      }

      if (confidence >= 0.5) {
        matches.push({ intent: rule.intent, label: rule.label, confidence, matched });
      }
    }

    matches.sort((a, b) => b.confidence - a.confidence);

    const seen = new Set();
    const unique = matches.filter(m => {
      if (seen.has(m.intent)) return false;
      seen.add(m.intent);
      return true;
    });

    return unique;
  },

  /**
   * Extract clinical entities (duration, location, severity, eating, nausea, fever, AYUSH sleep)
   * from spoken or typed statements in Hindi, English, and Hinglish.
   */
  extractEntities(inputStr) {
    if (!inputStr || typeof inputStr !== 'string') return {};
    const norm = this.normalize(inputStr);
    const entities = {};

    // 1. Duration Extraction
    if (/\b(3\s*din|teen\s*din|तीन\s*दिन|3\s*days?|three\s*days?|2\s*din|do\s*din|दो\s*दिन|2\s*days?|two\s*days?|kal\s*se|कल\s*से|yesterday|since\s*yesterday|parson\s*se|परसों\s*से)\b/i.test(norm) ||
        norm.includes('3 din') || norm.includes('3 days') || norm.includes('teen din') || norm.includes('2 din') || norm.includes('2 days') || norm.includes('kal se') || norm.includes('yesterday')) {
      entities.duration = '1 – 3 days';
      entities.rawDuration = '1–3 days';
    } else if (/\b(4\s*din|char\s*din|चार\s*दिन|4\s*days?|four\s*days?|5\s*din|panch\s*din|पाँच\s*दिन|पाच\s*दिन|5\s*days?|five\s*days?|6\s*din|chhah\s*din|6\s*days?|7\s*din|saat\s*din|7\s*days?|seven\s*days?)\b/i.test(norm) ||
               norm.includes('5 din') || norm.includes('4 din') || norm.includes('5 days') || norm.includes('4 days') || norm.includes('panch din')) {
      entities.duration = '4 – 7 days';
      entities.rawDuration = '4–7 days';
    } else if (/\b(1\s*din|ek\s*din|एक\s*दिन|1\s*day|one\s*day|aaj\s*se|आज\s*से|today|abhi\s*se|less\s*than|hours?|ghante)\b/i.test(norm) ||
               norm.includes('aaj se') || norm.includes('today') || norm.includes('1 din') || norm.includes('1 day')) {
      entities.duration = 'Less than 1 day';
      entities.rawDuration = '< 1 day';
    } else if (/\b(hafta|hafte|week|weeks|mahina|month|months|kai\s*din|many\s*days|हफ्ता|महीना|10\s*din|15\s*din|20\s*din)\b/i.test(norm) ||
               norm.includes('week') || norm.includes('hafta') || norm.includes('month') || norm.includes('kai din')) {
      entities.duration = 'More than 7 days';
      entities.rawDuration = '> 7 days';
    }

    // 2. Anatomical Location Extraction
    if (/\b(nabhi|navel|nabhi\s*ke\s*paas|नाभि|around\s*navel|centre|center|beech)\b/i.test(norm) || norm.includes('nabhi') || norm.includes('navel')) {
      entities.location = 'Around Navel';
      entities.bodyLocation = 'Around Navel';
    } else if (/\b(upar\s*pet|ऊपर\s*पेट|upper\s*abdomen|upper\s*stomach|pet\s*ke\s*upar|chhati\s*ke\s*niche)\b/i.test(norm) || norm.includes('upper abdomen') || norm.includes('upar pet')) {
      entities.location = 'Upper Abdomen';
      entities.bodyLocation = 'Upper Abdomen';
    } else if (/\b(niche\s*pet|नीचे\s*पेट|lower\s*abdomen|lower\s*stomach|pet\s*ke\s*niche|pedu|पेड़ू)\b/i.test(norm) || norm.includes('lower abdomen') || norm.includes('niche pet')) {
      entities.location = 'Lower Abdomen';
      entities.bodyLocation = 'Lower Abdomen';
    } else if (/\b(bayi|bayen|left\s*side|left|बाईं|बाएं)\b/i.test(norm) || norm.includes('left side')) {
      entities.location = 'Left Side';
      entities.bodyLocation = 'Left Side';
    } else if (/\b(dahini|dayen|right\s*side|right|दाहिनी|दाएं)\b/i.test(norm) || norm.includes('right side')) {
      entities.location = 'Right Side';
      entities.bodyLocation = 'Right Side';
    } else if (/\b(sir|head|matha|sar|forehead|माथा|सिर)\b/i.test(norm) && !norm.includes('pet')) {
      entities.location = 'Head';
      entities.bodyLocation = 'Head';
    } else if (/\b(chhati|chest|sine|छाती)\b/i.test(norm)) {
      entities.location = 'Chest';
      entities.bodyLocation = 'Chest';
    }

    // 3. Clinical Severity Extraction
    if (/\b(madhyam|मध्यम|moderate|theek\s*theek|beech\s*ka|medium)\b/i.test(norm) || norm.includes('moderate') || norm.includes('madhyam')) {
      entities.severity = 'Moderate';
    } else if (/\b(halka|हल्का|mild|thoda|thoda\s*sa|कम|kam|slight)\b/i.test(norm) || norm.includes('mild') || norm.includes('halka')) {
      entities.severity = 'Mild';
    } else if (/\b(bahut\s*tez|bahut\s*zyada|बहुत\s*तेज़|very\s*severe|extremely\s*severe|bardasht\s*nahi|असहनीय)\b/i.test(norm) || norm.includes('very severe') || norm.includes('bahut tez')) {
      entities.severity = 'Very Severe';
    } else if (/\b(tez|severe|zyada|गंभीर|ज़्यादा|intense|high)\b/i.test(norm) || norm.includes('severe') || norm.includes('tez dard')) {
      entities.severity = 'Severe';
    }

    // 4. Eating Relationship
    if (/\b(khane\s*ke\s*baad|after\s*eating|after\s*food|after\s*meals|food\s*ke\s*baad|khana\s*khate\s*hi)\b/i.test(norm) || norm.includes('khane ke baad') || norm.includes('after food') || norm.includes('after eating')) {
      entities.eating = 'Yes – worse after eating';
    } else if (/\b(khane\s*se\s*pehle|before\s*eating|before\s*food|empty\s*stomach|bhukhe\s*pet)\b/i.test(norm) || norm.includes('khane se pehle') || norm.includes('before food') || norm.includes('empty stomach')) {
      entities.eating = 'Yes – worse before eating';
    }

    // 5. Nausea / Vomiting
    if (/\b(ulti\s*bhi|vomiting\s*and\s*nausea|dono\s*ulti|ulti\s*aur\s*matli)\b/i.test(norm)) {
      entities.nausea = 'Both nausea and vomiting';
    } else if (/\b(ulti|vomit|vomiting|ultee|उल्टी)\b/i.test(norm) || norm.includes('ulti') || norm.includes('vomiting') || norm.includes('vomit')) {
      entities.nausea = 'Vomiting occurred';
    } else if (/\b(ji\s*ghabra|nausea|matli|मतली|ulti\s*jaisa)\b/i.test(norm) || norm.includes('nausea') || norm.includes('matli')) {
      entities.nausea = 'Nausea only (no vomiting)';
    }

    // 6. Associated Fever
    if (/\b(fever|bukhar|bukhaar|ताप|बुखार)\b/i.test(norm)) {
      entities.fever = 'Yes';
      entities.feverAssociated = 'Yes';
    }

    // 7. AYUSH Sleep Context Extraction
    if (norm.includes('neend theek nahi') || norm.includes('neend kharab') || norm.includes('नींद ठीक नहीं') || norm.includes('नींद नहीं आती') || norm.includes('poor sleep') || norm.includes('insomnia')) {
      entities.ayushSleep = 'Frequently disturbed';
    } else if (norm.includes('achhi neend') || norm.includes('अच्छी नींद') || norm.includes('good sleep') || norm.includes('pura sota')) {
      entities.ayushSleep = 'Regular & restful';
    }

    return entities;
  }
};
