/**
 * MediSarthi — Core Application Controller & State Engine
 * Complete version with full adaptive question flows, AYUSH multi-question survey,
 * and connected follow-up questions for all symptom pathways.
 */

// --- ROBUST TRANSLATION & SPEECH HELPER ---
function getActiveLanguage() {
  return localStorage.getItem('medisarthi_lang') || 'en';
}

function getLocalizedText(key, fallbackText) {
  if (!key) return '';
  const lang = getActiveLanguage();
  const dict = (typeof TRANSLATIONS !== 'undefined' ? TRANSLATIONS : (window.TRANSLATIONS || {}));
  if (dict[lang] && dict[lang][key] !== undefined) {
    return dict[lang][key];
  }
  if (dict['en'] && dict['en'][key] !== undefined) {
    return dict['en'][key];
  }
  return fallbackText !== undefined ? fallbackText : key;
}

function speakText(text) {
  if (!text || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); 
  
  const lang = getActiveLanguage();
  const langMap = {
    'hi': 'hi-IN',
    'mr': 'mr-IN',
    'bn': 'bn-IN',
    'te': 'te-IN',
    'en': 'en-IN'
  };
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langMap[lang] || 'en-IN';
  utterance.rate = 0.95;
  
  const voices = window.speechSynthesis.getVoices();
  let matchingVoice = voices.find(voice =>
    voice.lang.toLowerCase() === utterance.lang.toLowerCase()
  ) || voices.find(voice =>
    voice.lang.toLowerCase().startsWith(lang) || (lang === 'mr' && voice.lang.toLowerCase().startsWith('mar'))
  );
  
  if (!matchingVoice && lang === 'mr') {
    matchingVoice = voices.find(voice => voice.lang.toLowerCase().startsWith('hi'));
    if (matchingVoice) utterance.lang = matchingVoice.lang;
  }
  
  if (matchingVoice) utterance.voice = matchingVoice;
  window.speechSynthesis.speak(utterance);
}

const App = window.App = {
  currentLang: 'en',
  currentScreen: 1,
  mode: 'patient',
  patientType: 'new',

  t(enStr) {
    if (!enStr) return enStr;
    return getLocalizedText(enStr, enStr);
  },

  speak(text) {
    if (!text) return;
    const translatedText = this.t(text);
    speakText(translatedText);
  },

  // ── Adaptive Question Engine State ──────────────────────────────────────────
  aqFlow: [],          // Array of question objects for current symptom
  aqIndex: 0,          // Current question index within the flow
  aqAnswers: {},       // { questionId: answer }

  // ── Patient Kiosk Session State ─────────────────────────────────────────────
  state: {
    aadhaar: "",
    fullName: "",
    age: "",
    gender: "Male",
    mobile: "",
    patientId: "",
    chiefComplaint: "",
    symptomIntent: "",
    bodyLocation: "Not specified",
    duration: "",
    severity: "",
    medicalHistory: "",
    allergies: "",
    medications: "",
    reportsUploaded: [],           // Starts empty by default
    conversationLog: [],
    ayushAnswers: {},
    ayushRequested: false
  },

  activeDoctorPatient: null,

  // ── ADAPTIVE QUESTION FLOWS ──────────────────────────────────────────────────
  // Each flow is an ordered array of question objects.
  // type: 'options' | 'yesno' | 'severity' | 'text' | 'body_map'
  flows: {
    stomach_pain: [
      {
        id: 'sp_location', text: 'Where is your abdominal pain located?',
        subtitle: 'Tap on the body diagram or select the area below.',
        type: 'body_map',
        options: ['Upper Abdomen','Around Navel','Lower Abdomen','Left Side','Right Side','All Over']
      },
      {
        id: 'sp_duration', text: 'How long have you had this stomach pain?',
        subtitle: 'Select how many days or hours you have experienced this.',
        type: 'options',
        options: ['Less than 24 hours','1 – 3 days','4 – 7 days','More than 1 week']
      },
      {
        id: 'sp_severity', text: 'How severe is the stomach pain right now?',
        subtitle: 'Choose the option that describes your pain intensity.',
        type: 'severity',
        options: ['Mild','Moderate','Severe']
      },
      {
        id: 'sp_onset', text: 'How did the abdominal pain start?',
        subtitle: 'Select the onset pattern of your discomfort.',
        type: 'options',
        options: ['Sudden & sharp (came out of nowhere)','Gradually (building up over time)','Cramping (comes and goes in waves)']
      },
      {
        id: 'sp_eating', text: 'Does eating or drinking affect the pain?',
        subtitle: 'Think about whether meals trigger or relieve your discomfort.',
        type: 'options',
        options: ['Worse after eating','Worse on empty stomach / before meals','Relieved after eating or vomiting','No relation to food']
      },
      {
        id: 'sp_nausea', text: 'Have you experienced nausea or vomiting?',
        subtitle: 'Select any associated digestive discomfort.',
        type: 'options',
        options: ['No nausea or vomiting','Nausea only (feeling sick)','Occasional vomiting','Frequent vomiting (cannot keep liquids down)']
      },
      {
        id: 'sp_fever_associated', text: 'Do you have fever along with the stomach pain?',
        subtitle: 'Check if you have experienced chills or high temperature.',
        type: 'yesno',
        options: ['No fever','Low-grade fever','High fever with chills']
      },
      {
        id: 'sp_bowel', text: 'Have you noticed any change in your bowel movements?',
        subtitle: 'Select if you have diarrhea, constipation, or abnormal stool.',
        type: 'options',
        options: ['Normal motions','Loose stools / Diarrhea','Constipation (no motion)','Black stool or blood in stool','Pain or burning during urination']
      },
      {
        id: 'sp_past_history', text: 'Have you had similar stomach pain episodes before?',
        subtitle: 'Tell us if this is a recurring or known condition.',
        type: 'options',
        options: ['First time ever','Occasional past acidity / cramps','Known condition (e.g. Gastritis, Ulcer, IBS, Gallstones)']
      }
    ],

    cough_cold: [
      {
        id: 'cc_duration', text: 'How long have you been coughing?',
        subtitle: 'Select the duration of your cough.',
        type: 'options',
        options: ['Less than 3 days','4 – 7 days','1 – 3 weeks','More than 3 weeks (chronic)']
      },
      {
        id: 'cc_type', text: 'What type of cough do you have?',
        subtitle: 'Select the character of your cough and sputum.',
        type: 'options',
        options: ['Dry cough (no sputum/mucus)','Wet cough with clear/white mucus','Wet cough with yellow/green phlegm','Blood-streaked cough / phlegm']
      },
      {
        id: 'cc_severity', text: 'How severely is the cough impacting you?',
        subtitle: 'Rate the disruption to your sleep and daily activity.',
        type: 'severity',
        options: ['Mild','Moderate','Severe']
      },
      {
        id: 'cc_breathing', text: 'Are you having any difficulty breathing?',
        subtitle: 'This is crucial for determining respiratory stability.',
        type: 'options',
        options: ['Breathing is normal','Stuffy nose / throat obstruction only','Mild breathlessness on climbing stairs','Shortness of breath at rest','Pain or tightness in chest when breathing']
      },
      {
        id: 'cc_fever', text: 'Do you have a fever accompanying your cough?',
        subtitle: 'Select your temperature status.',
        type: 'yesno',
        options: ['No fever','Low-grade fever (feeling warm)','High fever with body chills']
      },
      {
        id: 'cc_throat', text: 'Do you have a sore throat or runny nose?',
        subtitle: 'Check upper airway involvement.',
        type: 'options',
        options: ['Neither','Sore throat / pain when swallowing','Runny or blocked nose','Both sore throat and runny nose']
      },
      {
        id: 'cc_cold_contact', text: 'Have you been exposed to anyone with flu or allergy history?',
        subtitle: 'Select any known exposure or personal medical history.',
        type: 'options',
        options: ['No known contact','Family or workplace contact with cold/flu','History of asthma or environmental allergies']
      }
    ],

    fever: [
      {
        id: 'fv_duration', text: 'How long have you had the fever?',
        subtitle: 'Select the duration of elevated temperature.',
        type: 'options',
        options: ['Started today (< 24 hrs)','1 – 3 days','4 – 7 days','More than 7 days (prolonged fever)']
      },
      {
        id: 'fv_severity', text: 'How high is your body temperature?',
        subtitle: 'Select approximate temperature range if measured.',
        type: 'options',
        options: ['Mild (< 100°F / 37.8°C)','Moderate (100 – 102°F / 37.8 – 38.9°C)','High (above 102°F / 38.9°C)','Not measured (body feels very hot)']
      },
      {
        id: 'fv_chills', text: 'Are you experiencing shivering or chills?',
        subtitle: 'Select if you feel cold despite fever.',
        type: 'yesno',
        options: ['No chills','Feeling cold / mild shivering','Severe shivering & teeth chattering']
      },
      {
        id: 'fv_onset', text: 'What is the pattern of your fever?',
        subtitle: 'Select how the fever progresses during the day.',
        type: 'options',
        options: ['Sudden high fever','Gradual rise over a day','Comes and goes (intermittent / spikes at night)']
      },
      {
        id: 'fv_associated_redflags', text: 'Do you have any of these associated warning signs?',
        subtitle: 'Select any significant red flag symptoms present.',
        type: 'options',
        options: ['No major associated symptoms','Severe headache with stiff neck','Red skin rash or petechiae','Bleeding from nose/gums','Extreme dizziness or confusion']
      },
      {
        id: 'fv_cough', text: 'Do you have a cough with the fever?',
        subtitle: 'Check respiratory involvement.',
        type: 'yesno',
        options: ['No cough','Dry cough','Cough with phlegm']
      },
      {
        id: 'fv_vomiting', text: 'Do you have digestive symptoms like vomiting or diarrhea?',
        subtitle: 'Select any stomach upset accompanying fever.',
        type: 'options',
        options: ['Neither','Vomiting only','Loose stools / Diarrhea','Both vomiting & diarrhea']
      },
      {
        id: 'fv_travel', text: 'Have you recently traveled or been exposed to mosquitoes?',
        subtitle: 'Helps evaluate regional infection risk.',
        type: 'yesno',
        options: ['No recent travel','Traveled to another region in last 2 weeks','Mosquito bite prone area / rainy season exposure']
      }
    ],

    headache: [
      {
        id: 'hd_duration', text: 'How long have you had this headache?',
        subtitle: 'Select how long the head pain has lasted.',
        type: 'options',
        options: ['Started today (< 24 hrs)','1 – 3 days','3 – 7 days','Recurring for weeks/months']
      },
      {
        id: 'hd_location', text: 'Where on your head is the pain localized?',
        subtitle: 'Select the primary location of discomfort.',
        type: 'options',
        options: ['Forehead / Front','Temples (one or both sides)','Back of head and neck','Behind eyes','Entire head']
      },
      {
        id: 'hd_severity', text: 'How severe is your headache right now?',
        subtitle: 'Rate how much the pain restricts your focus.',
        type: 'severity',
        options: ['Mild','Moderate','Severe']
      },
      {
        id: 'hd_onset', text: 'What is the pain quality and onset?',
        subtitle: 'Select the character of your headache.',
        type: 'options',
        options: ['Gradual pressure / tension','Throbbing or pulsating in waves','Sudden severe onset','Constant dull heaviness']
      },
      {
        id: 'hd_light', text: 'Are you sensitive to bright light or loud noise?',
        subtitle: 'Select any sensory sensitivity felt during headache.',
        type: 'options',
        options: ['No sensitivity','Sensitive to bright light (Photophobia)','Sensitive to loud noise (Phonophobia)','Sensitive to both light and noise']
      },
      {
        id: 'hd_vision', text: 'Have you noticed any visual disturbances or aura?',
        subtitle: 'Check for neurological visual symptoms.',
        type: 'options',
        options: ['No vision changes','Blurred vision or eye strain','Seeing zigzag lines or flashes (Aura)','Double vision or drooping eyelid']
      },
      {
        id: 'hd_nausea', text: 'Do you feel nauseous with the headache?',
        subtitle: 'Check associated nausea or vomiting.',
        type: 'yesno',
        options: ['No nausea','Nausea only','Nausea with vomiting']
      },
      {
        id: 'hd_previous', text: 'Have you had similar headaches before?',
        subtitle: 'Tell us about your past headache history.',
        type: 'options',
        options: ['First time ever having this pain','Occasional tension headaches','Known Migraine diagnosis','History of high blood pressure']
      }
    ],

    body_pain: [
      {
        id: 'bp_location', text: 'Where is the pain located in your body?',
        subtitle: 'Select the body region most affected.',
        type: 'options',
        options: ['Generalized whole-body ache','Back / Spine pain','Knees / Leg joints','Shoulders / Neck stiffness','Multiple small joints (hands/feet)','Muscle soreness after strain']
      },
      {
        id: 'bp_duration', text: 'How long have you had this body pain?',
        subtitle: 'Select how long the soreness has persisted.',
        type: 'options',
        options: ['1 – 3 days','4 – 7 days','1 – 4 weeks','More than 1 month (chronic pain)']
      },
      {
        id: 'bp_severity', text: 'How severe is the body pain?',
        subtitle: 'Rate the restriction on movement and walking.',
        type: 'severity',
        options: ['Mild','Moderate','Severe']
      },
      {
        id: 'bp_fever', text: 'Is your body pain accompanied by fever?',
        subtitle: 'Check if fever is present with body pain.',
        type: 'yesno',
        options: ['No fever','Low-grade fever','High fever with body weakness']
      },
      {
        id: 'bp_swelling', text: 'Do you notice any joint swelling or redness?',
        subtitle: 'Select if inflammatory joint signs exist.',
        type: 'yesno',
        options: ['No joint swelling','Slight swelling / warmth','Visible joint swelling & redness']
      },
      {
        id: 'bp_activity', text: 'How does movement or rest affect the pain?',
        subtitle: 'Select the positional or movement response.',
        type: 'options',
        options: ['Worse with movement / exercise','Worse after rest / morning stiffness','Constant pain regardless of posture','Better after mild movement']
      }
    ],

    something_else: [
      {
        id: 'se_problem', text: 'Please describe your health concern in detail.',
        subtitle: 'Type in the box or tap microphone to speak.',
        type: 'text'
      },
      {
        id: 'se_duration', text: 'How long have you experienced this issue?',
        subtitle: 'Select the duration.',
        type: 'options',
        options: ['Just started today','1 – 3 days','4 – 7 days','More than 1 week']
      },
      {
        id: 'se_severity', text: 'How severely is this impacting your daily routine?',
        subtitle: 'Rate the overall severity.',
        type: 'severity',
        options: ['Mild','Moderate','Severe']
      },
      {
        id: 'se_other_symptoms', text: 'Are there any associated symptoms?',
        subtitle: 'Select any accompanying issues.',
        type: 'options',
        options: ['No other symptoms','Fever or chills','Nausea, vomiting, or stomach upset','Dizziness or extreme weakness','Breathing discomfort']
      },
      {
        id: 'se_history', text: 'Have you had this health concern before?',
        subtitle: 'Select medical history context.',
        type: 'options',
        options: ['First time experiencing this','Occasional past episodes','Ongoing diagnosed condition']
      }
    ]
  },

  // ── AYUSH MULTI-QUESTION FLOW ────────────────────────────────────────────────
  ayushQuestions: [
    {
      id: 'ay_sleep', title: 'Sleep Pattern',
      text: 'What time do you usually sleep and wake up, and how would you describe your sleep?',
      subtitle: 'Select your sleep pattern', type: 'options', icon: '<i class="fa-solid fa-moon" style="color:var(--primary);"></i>',
      options: ['Regular & restful','Regular but not restful','Irregular','Frequently disturbed']
    },
    {
      id: 'ay_routine', title: 'Daily Routine',
      text: 'How regular is your daily routine for waking, meals, work/study and bedtime?',
      subtitle: 'Select your routine regularity', type: 'options', icon: '<i class="fa-solid fa-clock" style="color:var(--primary);"></i>',
      options: ['Very regular','Mostly regular','Somewhat irregular','Highly irregular']
    },
    {
      id: 'ay_food', title: 'Food Pattern',
      text: 'What best describes your usual eating pattern?',
      subtitle: 'Select your eating habit', type: 'options', icon: '<i class="fa-solid fa-bowl-food" style="color:var(--primary);"></i>',
      options: ['Mostly home-cooked','Mix of home-cooked & outside','Mostly outside or packaged','Irregular meals']
    },
    {
      id: 'ay_meal_timing', title: 'Meal Timing',
      text: 'How often do you skip or delay your meals?',
      subtitle: 'Select meal regularity', type: 'options', icon: '<i class="fa-solid fa-utensils" style="color:var(--primary);"></i>',
      options: ['Never','Occasionally','Frequently','Almost every day']
    },
    {
      id: 'ay_digestion', title: 'Digestion',
      text: 'How would you describe your digestion after meals?',
      subtitle: 'Select digestion feeling', type: 'options', icon: '<i class="fa-solid fa-fire-burner" style="color:var(--primary);"></i>',
      options: ['Comfortable','Occasional bloating or gas','Frequent bloating or gas','Acidity or heartburn','Constipation','Irregular or loose stools']
    },
    {
      id: 'ay_appetite', title: 'Appetite',
      text: 'How has your appetite been recently?',
      subtitle: 'Select appetite status', type: 'options', icon: '<i class="fa-solid fa-apple-whole" style="color:var(--primary);"></i>',
      options: ['Normal','Increased','Reduced','Changes frequently']
    },
    {
      id: 'ay_activity', title: 'Physical Activity',
      text: 'How much physical activity or exercise do you usually get?',
      subtitle: 'Select activity level', type: 'options', icon: '<i class="fa-solid fa-person-walking" style="color:var(--primary);"></i>',
      options: ['Daily','3–5 days a week','1–2 days a week','Rarely','None']
    },
    {
      id: 'ay_screen_time', title: 'Screen & Sitting Time',
      text: 'How much of your day do you usually spend sitting or using screens?',
      subtitle: 'Select daily sitting/screen duration', type: 'options', icon: '<i class="fa-solid fa-desktop" style="color:var(--primary);"></i>',
      options: ['Less than 2 hours','2–5 hours','5–8 hours','More than 8 hours']
    },
    {
      id: 'ay_stress', title: 'Stress',
      text: 'How often do you feel stressed or mentally overwhelmed?',
      subtitle: 'Select stress frequency', type: 'options', icon: '<i class="fa-solid fa-brain" style="color:var(--primary);"></i>',
      options: ['Rarely','Sometimes','Often','Almost every day']
    },
    {
      id: 'ay_stress_mgmt', title: 'Stress Management',
      text: 'What do you usually do to relax or manage stress?',
      subtitle: 'Select relaxation habit', type: 'options', icon: '<i class="fa-solid fa-heart" style="color:var(--primary);"></i>',
      options: ['Walking/exercise','Yoga','Meditation or breathing','Music/creative activities','Talking to others','Rest/sleep','Nothing specific','Other']
    },
    {
      id: 'ay_wellness', title: 'Wellness Practices',
      text: 'Do you currently follow practices such as yoga, meditation, breathing exercises, oil massage, or other traditional wellness practices?',
      subtitle: 'Select wellness practice routine', type: 'options', icon: '<i class="fa-solid fa-om" style="color:var(--primary);"></i>',
      options: ['Regularly','Occasionally','Tried before','Not currently']
    },
    {
      id: 'ay_lifestyle_concern', title: 'Lifestyle Concern',
      text: 'Is there any lifestyle habit or wellness concern you would like the doctor to know about?',
      subtitle: 'Optional free-text input', type: 'text', icon: '<i class="fa-solid fa-pen-fancy" style="color:var(--primary);"></i>'
    }
  ],

  ayushIndex: 0,
  ayushAnswers: {},

  // ── LOCAL STORAGE PATIENT QUEUE PERSISTENCE ─────────────────────────────
  getStoredQueue() {
    try {
      const stored = localStorage.getItem('medisarthi_patient_queue');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error reading stored patient queue:", e);
    }
    // Seed with DEMO_DATA.patientQueue if localStorage key does not exist
    if (typeof DEMO_DATA !== 'undefined' && DEMO_DATA.patientQueue) {
      this.saveStoredQueue(DEMO_DATA.patientQueue);
      return DEMO_DATA.patientQueue;
    }
    return [];
  },

  saveStoredQueue(queue) {
    try {
      localStorage.setItem('medisarthi_patient_queue', JSON.stringify(queue));
    } catch (e) {
      console.error("Error saving patient queue to localStorage:", e);
    }
  },

  // ── PHASE 7B: SESSION PERSISTENCE & HISTORY ENGINE ───────────────────────
  saveSession() {
    try {
      const sessionData = {
        state: this.state,
        currentScreen: this.currentScreen,
        patientType: this.patientType,
        aqIndex: this.aqIndex,
        aqAnswers: this.aqAnswers,
        ayushIndex: this.ayushIndex,
        ayushAnswers: this.ayushAnswers,
        currentLang: this.currentLang
      };
      sessionStorage.setItem('medisarthi_patient_session', JSON.stringify(sessionData));
    } catch (e) {
      console.error("Error saving patient session:", e);
    }
  },

  restoreSession() {
    try {
      const raw = sessionStorage.getItem('medisarthi_patient_session');
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || !data.currentScreen) return false;

      this.state = data.state || this.state;
      this.currentScreen = data.currentScreen || 1;
      this.patientType = data.patientType || 'new';
      this.aqIndex = typeof data.aqIndex === 'number' ? data.aqIndex : 0;
      this.aqAnswers = data.aqAnswers || {};
      this.ayushIndex = typeof data.ayushIndex === 'number' ? data.ayushIndex : 0;
      this.ayushAnswers = data.ayushAnswers || {};

      if (data.currentLang) {
        this.setLanguage(data.currentLang);
      }

      if (this.state.symptomIntent) {
        this.aqFlow = this.flows[this.state.symptomIntent] || this.flows['something_else'];
      }

      this.syncDOMFromState();
      return true;
    } catch (e) {
      console.error("Error restoring patient session:", e);
      return false;
    }
  },

  clearSession() {
    try {
      sessionStorage.removeItem('medisarthi_patient_session');
    } catch (e) {
      console.error("Error clearing patient session:", e);
    }
    this.state = {
      aadhaar: "",
      fullName: "",
      age: "",
      gender: "Male",
      mobile: "",
      patientId: "MS" + Math.floor(1000 + Math.random() * 9000),
      chiefComplaint: "",
      symptomIntent: "",
      bodyLocation: "Not specified",
      duration: "",
      severity: "",
      medicalHistory: "",
      allergies: "",
      medications: "",
      reportsUploaded: [],
      conversationLog: [],
      ayushAnswers: {},
      ayushRequested: false
    };
    this.aqFlow = [];
    this.aqIndex = 0;
    this.aqAnswers = {};
    this.ayushIndex = 0;
    this.ayushAnswers = {};
    this.patientType = 'new';
  },

  syncDOMFromState() {
    // Aadhaar
    const aadhaarInput = document.getElementById('aadhaar-input');
    if (aadhaarInput && this.state.aadhaar) {
      let raw = this.state.aadhaar.replace(/\D/g, '').substring(0, 12);
      aadhaarInput.value = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    }

    // Demographics
    if (this.patientType === 'existing') {
      const existingView = document.getElementById('existing-profile-view');
      const newForm = document.getElementById('new-profile-form');
      if (existingView) existingView.style.display = 'block';
      if (newForm) newForm.style.display = 'none';

      const setIfExists = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
      };
      setIfExists('retrieved-name', this.state.fullName || 'Ramesh Patil');
      setIfExists('retrieved-full-name', this.state.fullName || 'Ramesh Patil');
      setIfExists('retrieved-age-gender', `${this.state.age} / ${getLocalizedText(this.state.gender, this.state.gender)}`);
      setIfExists('retrieved-id', this.state.patientId || 'MS1001');
      setIfExists('retrieved-history', this.state.medicalHistory || '');
      setIfExists('retrieved-allergies', this.state.allergies || '');
    } else {
      const existingView = document.getElementById('existing-profile-view');
      const newForm = document.getElementById('new-profile-form');
      if (existingView) existingView.style.display = 'none';
      if (newForm) newForm.style.display = 'block';

      const nameInput = document.getElementById('input-full-name');
      if (nameInput) nameInput.value = this.state.fullName || '';
      const ageInput = document.getElementById('input-age');
      if (ageInput) ageInput.value = this.state.age || '';
      const mobileInput = document.getElementById('input-mobile');
      if (mobileInput) mobileInput.value = this.state.mobile || '';

      document.querySelectorAll('.gender-btn').forEach(btn => {
        const isMatch = btn.getAttribute('onclick')?.includes(`'${this.state.gender}'`);
        btn.classList.toggle('active', !!isMatch);
      });
    }

    // Allergies
    const allergyInput = document.getElementById('input-allergy');
    if (allergyInput && this.state.allergies) {
      if (this.state.allergies !== this.t('no_known_allergies') && this.state.allergies !== 'No Known Allergies') {
        allergyInput.value = this.state.allergies;
      }
    }

    // Chief Complaint
    const freeText = document.getElementById('free-text-input');
    if (freeText && this.state.chiefComplaint) {
      freeText.value = this.state.chiefComplaint;
    }
  },

  _isPoppingState: false,

  handlePopState(stateObj) {
    if (!stateObj || typeof stateObj.screen !== 'number') return;
    this._isPoppingState = true;
    const targetScreen = stateObj.screen;
    if (typeof stateObj.aqIndex === 'number') this.aqIndex = stateObj.aqIndex;
    if (typeof stateObj.ayushIndex === 'number') this.ayushIndex = stateObj.ayushIndex;

    this.showScreen(targetScreen, { pushState: false, isRestoring: true });

    if (targetScreen === 20) {
      this.showAdaptiveQuestion({ isRestoring: true });
    } else if (targetScreen === 17) {
      this.showAyushQuestion({ isRestoring: true });
    } else if (targetScreen === 16) {
      this.renderAyushSummary();
    } else if (targetScreen === 12) {
      this.updateSummaryCard();
    } else if (targetScreen === 21) {
      if (this.state.aadhaar) {
        const patient = this.findExistingPatient(this.state.aadhaar);
        if (patient) this.loadExistingPatientData(patient);
      }
    } else if (targetScreen === 22) {
      const displayEl = document.getElementById('not-found-aadhaar-display');
      if (displayEl && this.state.aadhaar) {
        displayEl.innerText = this.state.aadhaar.replace(/(\d{4})(?=\d)/g, '$1 ');
      }
    }

    this.syncDOMFromState();
    this._isPoppingState = false;
  },

  // ── INITIALIZATION ────────────────────────────────────────────────────────
  init() {
    console.log("Initializing MediSarthi App Engine...");
    const savedLang = localStorage.getItem('selectedLanguage') || 'en';
    this.currentLang = savedLang;
    window.translate = (text) => this.t(text);
    window.speak = (text) => this.speak(text);

    // Sync queue from localStorage (medisarthi_patient_queue is source of truth)
    const storedQueue = this.getStoredQueue();
    if (typeof DEMO_DATA !== 'undefined') {
      DEMO_DATA.patientQueue = storedQueue;
    }

    // Page-aware initialization
    const docDashboard = document.getElementById('doctor-dashboard-main');
    if (docDashboard) {
      if (sessionStorage.getItem('medisarthi_doc_auth') !== 'true') {
        window.location.href = 'doctor-login.html';
        return;
      }
      docDashboard.style.display = 'block';
      this.renderDoctorQueue();
      if (storedQueue.length > 0) {
        this.selectDoctorPatient(storedQueue[0].id);
      }
      return;
    }

    const loginCard = document.getElementById('doctor-login-card');
    if (loginCard) {
      if (sessionStorage.getItem('medisarthi_doc_auth') === 'true') {
        window.location.href = 'doctor.html';
        return;
      }
      return;
    }

    const kioskWrapper = document.getElementById('patient-kiosk-wrapper');
    if (kioskWrapper) {
      this.updateLanguageUI();

      window.addEventListener('popstate', (e) => {
        if (e.state && typeof e.state.screen === 'number') {
          this.handlePopState(e.state);
        }
      });

      const restored = this.restoreSession();
      if (restored) {
        const targetScreen = this.currentScreen || 1;
        this.showScreen(targetScreen, { pushState: false, isRestoring: true });
        if (targetScreen === 20) {
          this.showAdaptiveQuestion({ isRestoring: true });
        } else if (targetScreen === 17) {
          this.showAyushQuestion({ isRestoring: true });
        } else if (targetScreen === 16) {
          this.renderAyushSummary();
        } else if (targetScreen === 12) {
          this.updateSummaryCard();
        } else if (targetScreen === 21) {
          if (this.state.aadhaar) {
            const patient = this.findExistingPatient(this.state.aadhaar);
            if (patient) this.loadExistingPatientData(patient);
          }
        } else if (targetScreen === 22) {
          const displayEl = document.getElementById('not-found-aadhaar-display');
          if (displayEl && this.state.aadhaar) {
            displayEl.innerText = this.state.aadhaar.replace(/(\d{4})(?=\d)/g, '$1 ');
          }
        }
      } else {
        const initialState = { screen: 1, aqIndex: 0, ayushIndex: 0 };
        try {
          history.replaceState(initialState, '', '#step-1');
        } catch (e) {}
        this.showScreen(1, { pushState: false, isRestoring: true });
      }
    }
  },

  // ── LANGUAGE ENGINE ───────────────────────────────────────────────────────
  setLanguage(langCode) {
    if (!TRANSLATIONS[langCode]) langCode = 'en';
    this.currentLang = langCode;
    localStorage.setItem('selectedLanguage', langCode);
    localStorage.setItem('medisarthi_lang', langCode);
    document.querySelectorAll('.ms-lang-btn').forEach(btn => {
      const isActive = btn.id === `btn-lang-${langCode}`;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    VoiceController.setLanguage(langCode);
    this.updateLanguageUI();

    if (this.currentScreen === 20) this.showAdaptiveQuestion();
    else if (this.currentScreen === 17) this.showAyushQuestion();
    else if (this.currentScreen === 16) this.renderAyushSummary();
    else if (this.currentScreen === 12) this.updateSummaryCard();
  },

  selectLanguageAndContinue(langCode) {
    this.setLanguage(langCode);
    this.showScreen(4);
  },

  startFlowDirect() {
    this.showScreen(2);
  },

  updateLanguageUI() {
    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS['en'];
    document.querySelectorAll('[data-i18n]').forEach(elem => {
      const key = elem.getAttribute('data-i18n');
      if (dict[key] !== undefined) elem.innerText = dict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(elem => {
      const key = elem.getAttribute('data-i18n-placeholder');
      if (dict[key] !== undefined) elem.placeholder = dict[key];
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(elem => {
      const key = elem.getAttribute('data-i18n-aria-label');
      if (dict[key] !== undefined) elem.setAttribute('aria-label', dict[key]);
    });
  },

  openMoreLanguages() {
    alert("Supported Indian Languages:\nEnglish | हिंदी (Hindi) | मराठी (Marathi) | বাংলা (Bengali) | తెలుగు (Telugu)");
  },

  // ── SCREEN ROUTING ────────────────────────────────────────────────────────
  showScreen(screenNum, options = {}) {
    this.currentScreen = screenNum;
    
    // Hide all step sections
    document.querySelectorAll('[id^="step-"]').forEach(sec => {
      sec.style.display = 'none';
    });

    const target = document.getElementById(`step-${screenNum}`);
    if (target) {
      target.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (!options.isRestoring && !options.suppressSpeech) {
      if (screenNum === 6) {
        const text = this.t('what_brings_you');
        setTimeout(() => { speakText(text); }, 400);
      } else if (screenNum === 7) {
        const text = this.t('allergy_question');
        setTimeout(() => { speakText(text); }, 400);
      }
    }

    if (options.pushState !== false && !options.isRestoring && !this._isPoppingState) {
      const newState = {
        screen: screenNum,
        aqIndex: this.aqIndex || 0,
        ayushIndex: this.ayushIndex || 0
      };
      const curState = history.state;
      if (!curState || curState.screen !== newState.screen || curState.aqIndex !== newState.aqIndex || curState.ayushIndex !== newState.ayushIndex) {
        try {
          history.pushState(newState, '', `#step-${screenNum}`);
        } catch (e) {
          console.error("Error pushing history state:", e);
        }
      }
    }

    this.saveSession();
  },

  switchMode(targetMode) {
    this.mode = targetMode;
    if (targetMode === 'doctor') {
      window.location.href = 'doctor-login.html';
      return;
    }
    const kiosk = document.getElementById('patient-kiosk-wrapper');
    if (kiosk) {
      kiosk.classList.remove('hidden');
      this.showScreen(1);
    } else {
      window.location.href = 'index.html';
    }
  },

  toggleHelpModal() {
    document.getElementById('help-modal').classList.toggle('active');
  },

  // ── PATIENT KIOSK STEPS & RECORD LOOKUP ─────────────────────────────────
  selectPatientType(type) {
    this.patientType = type;
    this.saveSession();
    this.showScreen(3);
  },

  simulateScanAadhaar() {
    const overlay = document.getElementById('scan-overlay');
    if (overlay) overlay.style.display = 'flex';
    setTimeout(() => {
      if (overlay) overlay.style.display = 'none';
      const input = document.getElementById('aadhaar-input');
      if (input) input.value = "9876 5432 1098";
      this.state.aadhaar = "987654321098";
      this.showNotification("✅ Aadhaar QR scanned successfully!");
      setTimeout(() => this.validateAadhaarAndContinue(), 700);
    }, 2500);
  },

  formatAadhaarInput(input) {
    let raw = input.value.replace(/\D/g, '').substring(0, 12);
    let formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    input.value = formatted;
  },

  getStoredExistingPatients() {
    try {
      const stored = localStorage.getItem('medisarthi_existing_patients');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Error reading stored existing patients:", e);
    }
    const defaultList = (typeof DEMO_DATA !== 'undefined' && DEMO_DATA.existingPatients) ? DEMO_DATA.existingPatients : [
      {
        id: "MS1001",
        aadhaar: "987654321098",
        name: "Ramesh Patel",
        age: 45,
        gender: "Male",
        mobile: "+91 98201 54321",
        lastVisit: "12 Jul 2026",
        medicalHistory: "Mild Hypertension (on Amlodipine 5mg)",
        allergies: "Penicillin",
        medications: "Amlodipine 5mg OD"
      }
    ];
    this.saveStoredExistingPatients(defaultList);
    return defaultList;
  },

  saveStoredExistingPatients(list) {
    try {
      localStorage.setItem('medisarthi_existing_patients', JSON.stringify(list));
    } catch (e) {
      console.error("Error saving existing patients to localStorage:", e);
    }
  },

  findExistingPatient(aadhaar) {
    if (!aadhaar) return null;
    const cleanAadhaar = aadhaar.replace(/\D/g, '');

    // 1. Search in stored existing patients list
    const existingList = this.getStoredExistingPatients();
    let match = existingList.find(p => p.aadhaar && p.aadhaar.replace(/\D/g, '') === cleanAadhaar);
    if (match) return match;

    // 2. Search in patient queue (for previous visits with this aadhaar or ID)
    const queue = this.getStoredQueue();
    const queueMatch = queue.find(p => p.aadhaar && p.aadhaar.replace(/\D/g, '') === cleanAadhaar);
    if (queueMatch) {
      return {
        id: queueMatch.id || 'MS1001',
        aadhaar: cleanAadhaar,
        name: queueMatch.name || 'Ramesh Patel',
        age: queueMatch.age || 45,
        gender: queueMatch.gender || 'Male',
        mobile: queueMatch.mobile || '+91 98201 54321',
        lastVisit: queueMatch.time || 'Recent',
        medicalHistory: queueMatch.summary?.medicalHistory || queueMatch.medicalHistory || 'Mild Hypertension (on Amlodipine 5mg)',
        allergies: queueMatch.summary?.allergies || queueMatch.allergies || 'Penicillin',
        medications: queueMatch.summary?.medications || queueMatch.medications || 'Amlodipine 5mg OD'
      };
    }

    // 3. Fallback for Ramesh Patel demo Aadhaar (987654321098)
    if (cleanAadhaar === '987654321098') {
      return {
        id: "MS1001",
        aadhaar: "987654321098",
        name: "Ramesh Patel",
        age: 45,
        gender: "Male",
        mobile: "+91 98201 54321",
        lastVisit: "12 Jul 2026",
        medicalHistory: "Mild Hypertension (on Amlodipine 5mg)",
        allergies: "Penicillin",
        medications: "Amlodipine 5mg OD"
      };
    }

    return null;
  },

  validateAadhaarAndContinue() {
    const input = document.getElementById('aadhaar-input');
    const raw = input ? input.value.replace(/\D/g, '') : (this.state.aadhaar || '');
    if (raw.length !== 12) {
      this.showNotification("⚠️ Please enter exactly 12 digits.");
      return;
    }
    this.state.aadhaar = raw;

    if (this.patientType === 'existing') {
      const patient = this.findExistingPatient(raw);
      if (patient) {
        this.loadExistingPatientData(patient);
        this.showScreen(21);
      } else {
        const displayEl = document.getElementById('not-found-aadhaar-display');
        if (displayEl) {
          displayEl.innerText = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
        }
        this.showScreen(22);
      }
    } else {
      // New patient path
      const existingView = document.getElementById('existing-profile-view');
      const newForm = document.getElementById('new-profile-form');
      if (existingView) existingView.style.display = 'none';
      if (newForm) newForm.style.display = 'block';
      this.showScreen(5);
    }
  },

  loadExistingPatientData(p) {
    this.state = {
      ...this.state,
      fullName: p.name || p.fullName || 'Ramesh Patel',
      age: String(p.age || '45'),
      gender: p.gender || 'Male',
      mobile: p.mobile || '+91 98201 54321',
      patientId: p.id || 'MS1001',
      medicalHistory: p.medicalHistory || 'Mild Hypertension (on Amlodipine 5mg)',
      allergies: p.allergies || 'Penicillin',
      medications: p.medications || 'Amlodipine 5mg OD',
      aadhaar: p.aadhaar || this.state.aadhaar || '987654321098'
    };

    const nameEl = document.getElementById('welcome-patient-name');
    if (nameEl) nameEl.textContent = this.state.fullName;

    const exName = document.getElementById('ex-history-name');
    if (exName) exName.textContent = this.state.fullName;

    const exDemo = document.getElementById('ex-history-demographics');
    if (exDemo) exDemo.textContent = `${this.state.age} / ${getLocalizedText(this.state.gender, this.state.gender)} · ID: ${this.state.patientId}`;

    const exVisit = document.getElementById('ex-history-last-visit');
    if (exVisit) exVisit.textContent = p.lastVisit || '12 Jul 2026';

    const exMobile = document.getElementById('ex-history-mobile');
    if (exMobile) exMobile.textContent = this.state.mobile || 'Not provided';

    const exMed = document.getElementById('ex-history-medical');
    if (exMed) exMed.textContent = this.state.medicalHistory || 'None';

    const exAllergies = document.getElementById('ex-history-allergies');
    if (exAllergies) exAllergies.textContent = this.state.allergies || 'None';

    const exMeds = document.getElementById('ex-history-meds');
    if (exMeds) exMeds.textContent = this.state.medications || 'None';

    // Populate previous consultations history list
    const listContainer = document.getElementById('previous-consultations-list');
    if (listContainer) {
      const queue = this.getStoredQueue();
      const pastConsultations = queue.filter(item =>
        (item.id && item.id === this.state.patientId) ||
        (item.aadhaar && item.aadhaar.replace(/\D/g, '') === this.state.aadhaar.replace(/\D/g, ''))
      );

      if (pastConsultations.length > 0) {
        listContainer.innerHTML = pastConsultations.map(c => `
          <div style="background:var(--sand-light);border:1px solid var(--border);border-radius:8px;padding:12px 14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <strong style="color:var(--teal-deepest);font-size:0.92rem;">${c.chiefComplaint || 'General Consultation'}</strong>
              <span style="font-size:0.75rem;color:var(--text-muted);">${c.time || '12 Jul 2026'}</span>
            </div>
            <p style="font-size:0.82rem;color:var(--text-sub);margin:0;">
              ${c.summary ? (c.summary.problem ? 'Problem: ' + c.summary.problem + ' · ' : '') + (c.summary.duration ? 'Duration: ' + c.summary.duration : '') : 'Previous OPD consultation record'}
            </p>
            ${c.doctorNotes ? `<p style="font-size:0.78rem;color:var(--teal-deep);margin-top:4px;font-style:italic;">Doctor note: ${c.doctorNotes}</p>` : ''}
          </div>
        `).join('');
      } else {
        listContainer.innerHTML = `
          <div style="background:var(--sand-light);border:1px solid var(--border);border-radius:8px;padding:12px 14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <strong style="color:var(--teal-deepest);font-size:0.92rem;">Stomach Pain (Abdominal Cramps)</strong>
              <span style="font-size:0.75rem;color:var(--text-muted);">12 Jul 2026</span>
            </div>
            <p style="font-size:0.82rem;color:var(--text-sub);margin:0;">
              Duration: 1 – 3 days · Severity: Moderate · Location: Around Navel
            </p>
            <p style="font-size:0.78rem;color:var(--teal-deep);margin-top:4px;font-style:italic;">Doctor note: Suspected acute gastritis. Prescribed Pantoprazole & Drotin.</p>
          </div>
        `;
      }
    }
  },

  startNewConsultationForExisting() {
    const preserved = {
      patientId: this.state.patientId || 'MS1001',
      aadhaar: this.state.aadhaar || '987654321098',
      fullName: this.state.fullName || 'Ramesh Patel',
      age: this.state.age || '45',
      gender: this.state.gender || 'Male',
      mobile: this.state.mobile || '+91 98201 54321',
      medicalHistory: this.state.medicalHistory || 'Mild Hypertension (on Amlodipine 5mg)',
      allergies: this.state.allergies || 'Penicillin',
      medications: this.state.medications || 'Amlodipine 5mg OD'
    };

    // Reset current consultation fields while retaining patient identity & past history
    this.state = {
      ...this.state,
      ...preserved,
      chiefComplaint: '',
      symptomIntent: '',
      bodyLocation: 'Not specified',
      duration: '',
      severity: '',
      reportsUploaded: [],
      conversationLog: [],
      ayushAnswers: {},
      ayushRequested: false
    };

    this.aqFlow = [];
    this.aqIndex = 0;
    this.aqAnswers = {};
    this.ayushIndex = 0;
    this.ayushAnswers = {};
    this.patientType = 'existing';

    const allergyInput = document.getElementById('input-allergy');
    if (allergyInput && preserved.allergies && preserved.allergies.toLowerCase() !== 'none') {
      allergyInput.value = preserved.allergies;
    }

    this.showScreen(7);
  },

  retryAadhaar() {
    const input = document.getElementById('aadhaar-input');
    if (input) {
      input.value = '';
      input.focus();
    }
    this.showScreen(3);
  },

  registerAsNewFromNotFound() {
    const preservedAadhaar = this.state.aadhaar || '';
    this.clearSession();
    this.state.aadhaar = preservedAadhaar;
    this.patientType = 'new';
    const existingView = document.getElementById('existing-profile-view');
    const newForm = document.getElementById('new-profile-form');
    if (existingView) existingView.style.display = 'none';
    if (newForm) newForm.style.display = 'block';
    this.showScreen(5);
  },

  handleAllergiesBack() {
    if (this.patientType === 'existing') {
      this.showScreen(21);
    } else {
      this.showScreen(5);
    }
  },

  setGender(btnElem, genderVal) {
    document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
    btnElem.classList.add('active');
    this.state.gender = genderVal;
  },

  confirmProfileAndProceed() {
    if (this.patientType === 'new') {
      const name = document.getElementById('input-full-name').value.trim();
      const age = document.getElementById('input-age').value.trim();
      if (!name) { this.showNotification("⚠️ Please enter your full name."); return; }
      if (!age) { this.showNotification("⚠️ Please enter your age."); return; }
      this.state.fullName = name;
      this.state.age = age;
      this.state.mobile = document.getElementById('input-mobile').value || "";
    }
    const allergyInput = document.getElementById('input-allergy');
    if (this.patientType === 'existing' && this.state.allergies && this.state.allergies.toLowerCase() !== 'none' && this.state.allergies.toLowerCase() !== 'no known allergies') {
      allergyInput.value = this.state.allergies;
    } else {
      allergyInput.value = '';
    }

    this.state.conversationLog = [
      { sender: "MediSarthi", text: "Welcome to MediSarthi! What brings you here today?", time: this.nowTime() }
    ];
    this.showScreen(7);
  },

  setNoAllergies() {
    this.state.allergies = this.t('no_known_allergies');
    this.logMsg("Patient", `Allergies: ${this.state.allergies}`);
    this.showScreen(6);
  },

  toggleAllergy(btn, name) {
    const noAllergyChip = document.getElementById('chip-no-allergies');
    if (noAllergyChip) noAllergyChip.classList.remove('selected');
    btn.classList.toggle('selected');
  },

  selectNoAllergies(btn) {
    document.querySelectorAll('.allergy-chip').forEach(c => c.classList.remove('selected'));
    btn.classList.add('selected');
  },

  submitAllergies() {
    const selectedChips = Array.from(document.querySelectorAll('.allergy-chip.selected')).map(b => b.innerText.replace('✓', '').trim());
    const isNoAllergy = document.getElementById('chip-no-allergies')?.classList.contains('selected');
    const extraInput = document.getElementById('input-allergy')?.value.trim() || '';

    let allergies = [];
    if (isNoAllergy && selectedChips.length === 0) {
      allergies.push(this.t('no_known_allergies') || 'No Known Allergies');
    } else {
      allergies = allergies.concat(selectedChips);
    }
    if (extraInput) {
      allergies.push(extraInput);
    }

    this.state.allergies = allergies.join(', ') || this.t('no_known_allergies');
    this.logMsg("Patient", `Allergies: ${this.state.allergies}`);
    this.showScreen(6);
  },

  submitAllergy() {
    this.submitAllergies();
  },

  // ── VOICE & NLP ────────────────────────────────────────────────────────────
  _pendingVoiceTranscript: '',

  triggerVoiceInput() {
    const waveBox = document.getElementById('voice-listening-wave');
    const transcriptText = document.getElementById('voice-transcript-text');
    const confirmBox = document.getElementById('voice-confirm-box');
    if (confirmBox) confirmBox.style.display = 'none';

    if (waveBox) waveBox.style.display = 'flex';
    if (transcriptText) {
      transcriptText.innerText = `"${getLocalizedText('voice_listening_title', 'I am listening...')}"`;
    }

    VoiceController.setLanguage(this.currentLang);
    VoiceController.startListening(
      (transcript, isFinal) => {
        if (transcriptText) transcriptText.innerText = `"${transcript}"`;
        if (isFinal) {
          this._pendingVoiceTranscript = transcript;
          const freeInput = document.getElementById('free-text-input');
          if (freeInput) freeInput.value = transcript;

          setTimeout(() => {
            if (waveBox) waveBox.style.display = 'none';
            // Show human-centered voice confirmation box
            if (confirmBox) {
              const recogEl = document.getElementById('voice-recognized-text');
              if (recogEl) recogEl.innerText = `"${transcript}"`;
              confirmBox.style.display = 'block';
            } else {
              App.processInputIntent(transcript);
            }
          }, 600);
        }
      },
      (isListening) => {
        if (!isListening && (!this._pendingVoiceTranscript || !confirmBox || confirmBox.style.display === 'none')) {
          if (waveBox) waveBox.style.display = 'none';
        }
      }
    );
  },

  confirmVoiceInput() {
    const confirmBox = document.getElementById('voice-confirm-box');
    if (confirmBox) confirmBox.style.display = 'none';
    const text = this._pendingVoiceTranscript || document.getElementById('free-text-input')?.value || '';
    if (text) {
      this.processInputIntent(text);
    }
  },

  retryVoiceInput() {
    const confirmBox = document.getElementById('voice-confirm-box');
    if (confirmBox) confirmBox.style.display = 'none';
    this._pendingVoiceTranscript = '';
    const freeInput = document.getElementById('free-text-input');
    if (freeInput) freeInput.value = '';
    this.triggerVoiceInput();
  },

  processInputIntent(customText) {
    const inputVal = (customText || document.getElementById('free-text-input').value).trim();
    if (!inputVal) {
      this.showNotification("⚠️ " + getLocalizedText('type_your_problem', 'Please type or speak your symptom.'));
      return;
    }

    // Classify intents (supports speech variations & multi-symptom)
    const results = IntentClassifier.classifyMultiple(inputVal);
// Extract information already provided by the patient
const entities = IntentClassifier.extractEntities(inputVal);

console.log("MediSarthi extracted entities:", entities);

// Preserve details that were already mentioned in speech/text
if (entities.duration) {
    this.state.duration = entities.duration;
}

if (entities.severity) {
    this.state.severity = entities.severity;
}

if (entities.location) {
    this.state.bodyLocation = entities.location;
}

    if (results.length === 0 || results[0].intent === 'something_else') {
      this.state.chiefComplaint = inputVal.length > 40 ? inputVal.substring(0,40)+'...' : inputVal;
      this.state.symptomIntent = 'something_else';
      this.state.secondaryIntents = [];
      this.logMsg('Patient', inputVal, true);

      const lang = getActiveLanguage();
      let ackMsg = `Understood. Let us ask a few questions about your health issue.`;
      if (lang === 'hi') {
        ackMsg = `समझ गया। हम आपकी स्वास्थ्य समस्या के बारे में कुछ प्रश्न पूछेंगे।`;
      } else if (lang === 'mr') {
        ackMsg = `समजले. आम्ही तुमच्या आरोग्य समस्येबद्दल काही प्रश्न विचारू.`;
      }
      this.logMsg('MediSarthi', ackMsg);

      this.startFlow('something_else');
      return;
    }

    if (results.length >= 2) {
      // Multi-symptom recognition (e.g. fever + cough)
      const labels = results.map(r => getLocalizedText(r.intent, r.label)).join(' + ');
      const englishLabels = results.map(r => r.label).join(' + ');
      this.state.chiefComplaint = englishLabels;
      this.state.symptomIntent = results[0].intent;
      this.state.secondaryIntents = results.slice(1).map(r => r.intent);

      this.logMsg('Patient', inputVal, true);

      const lang = getActiveLanguage();
      let ackMsg = `Understood. You have ${labels}. I will ask relevant questions.`;
      if (lang === 'hi') {
        ackMsg = `समझ गया। आपको ${labels} की समस्या है। आइए संबंधित प्रश्न पूछते हैं।`;
      } else if (lang === 'mr') {
        ackMsg = `समजले. तुम्हाला ${labels} चा त्रास आहे. आम्ही काही महत्त्वाचे प्रश्न विचारू.`;
      }
      this.logMsg('MediSarthi', ackMsg);
    } else {
      // Single symptom recognition (e.g. headache / fever / stomach pain / cough)
      const result = results[0];
      this.state.chiefComplaint = result.label;
      this.state.symptomIntent = result.intent;
      this.state.secondaryIntents = [];

      this.logMsg('Patient', inputVal, true);

      const localLabel = getLocalizedText(result.intent, result.label);
      const lang = getActiveLanguage();
      let ackMsg = `Understood — I will ask you a few questions about your ${localLabel}.`;
      if (lang === 'hi') {
        ackMsg = `समझ गया। आपको ${localLabel} की समस्या है।`;
      } else if (lang === 'mr') {
        ackMsg = `समजले. तुम्हाला ${localLabel} चा त्रास आहे.`;
      } else if (lang === 'bn') {
        ackMsg = `বুঝেছি। আপনার ${localLabel} এর সমস্যা রয়েছে।`;
      } else if (lang === 'te') {
        ackMsg = `అర్థమైంది. మీకు ${localLabel} సమస్య ఉంది.`;
      }
      this.logMsg('MediSarthi', ackMsg);
    }

    // AUTOMATIC TRANSITION TO ADAPTIVE FLOW — DO NOT FORCE PATIENT TO CLICK SYMPTOM AGAIN
    this.startFlow(this.state.symptomIntent);
  },

  selectSymptom(symptomKey) {
    const labelMap = { stomach_pain:"Stomach Pain", cough_cold:"Cough / Cold", fever:"Fever", headache:"Headache", body_pain:"Body Pain", something_else:"Something Else" };
    this.state.symptomIntent = symptomKey;
    this.state.chiefComplaint = labelMap[symptomKey] || "Other";
    this.state.secondaryIntents = [];
    const localLabel = getLocalizedText(symptomKey, this.state.chiefComplaint);
    
    const lang = getActiveLanguage();
    let ackMsg = `Understood — I will ask you a few questions about your ${localLabel}.`;
    if (lang === 'hi') {
      ackMsg = `समझ गया। आपको ${localLabel} की समस्या है।`;
    } else if (lang === 'mr') {
      ackMsg = `समजले. तुम्हाला ${localLabel} चा त्रास आहे.`;
    }
    this.logMsg("Patient", `Selected: ${localLabel}`);
    this.logMsg("MediSarthi", ackMsg);
    this.startFlow(symptomKey);
  },

  // ── ADAPTIVE QUESTION ENGINE ──────────────────────────────────────────────
  startFlow(intentKey) {
    this.aqFlow = this.flows[intentKey] || this.flows['something_else'];
    this.aqIndex = 0;
    this.aqAnswers = {};

    // -----------------------------------------
    // Map extracted entities into aqAnswers & state
    // -----------------------------------------
    const existingLocation = this.state.bodyLocation;
    const existingDuration = this.state.duration;
    const existingSeverity = this.state.severity;

    // If patient said stomach pain and location isn't specified, default to Abdomen
    if (intentKey === 'stomach_pain' && (!existingLocation || existingLocation === 'Not specified')) {
      this.state.bodyLocation = 'Abdomen';
    }

    // Map extracted answers to relevant question IDs across flows
    if (this.state.bodyLocation && this.state.bodyLocation !== 'Not specified') {
      this.aqAnswers['sp_location'] = this.state.bodyLocation;
    }

    if (existingDuration) {
      this.aqFlow.forEach(q => {
        if (q.id.endsWith('_duration') || q.type === 'duration') {
          this.aqAnswers[q.id] = existingDuration;
        }
      });
    }

    if (existingSeverity) {
      this.aqFlow.forEach(q => {
        if (q.id.endsWith('_severity') || q.type === 'severity') {
          this.aqAnswers[q.id] = existingSeverity;
        }
      });
    }

    // Fast-forward past any question that already has an answer or is irrelevant
    while (this.aqIndex < this.aqFlow.length) {
      const question = this.aqFlow[this.aqIndex];
      if (this.aqAnswers[question.id]) {
        this.aqIndex++;
        continue;
      }
      if (this.shouldSkipQuestion(question)) {
        this.aqIndex++;
        continue;
      }
      break;
    }

    this.showAdaptiveQuestion();
  },

  showAdaptiveQuestion(options = {}) {
    if (this.aqIndex >= this.aqFlow.length) {
      // All questions answered — show summary
      this.updateSummaryCard();
      this.showScreen(12, options);
      return;
    }
    const q = this.aqFlow[this.aqIndex];
    const total = this.aqFlow.length;
    const current = this.aqIndex + 1;

    // Render into the dynamic adaptive question screen (step-20)
    const container = document.getElementById('aq-container');
    if (!container) return;

    let optionsHtml = '';
    const currentAnswer = this.aqAnswers[q.id];

    if (q.type === 'body_map') {
      optionsHtml = this.renderBodyMapHTML(q);
    } else if (q.type === 'severity') {
      const mildLabel = getLocalizedText('severity_level_mild', 'Mild');
      const modLabel = getLocalizedText('severity_level_moderate', 'Moderate');
      const sevLabel = getLocalizedText('severity_level_severe', 'Severe');
      const verySevLabel = getLocalizedText('severity_level_very_severe', 'Very Severe');
      const mildDesc = getLocalizedText('mild_desc', 'Little or no interference with daily activities');
      const modDesc = getLocalizedText('moderate_desc', 'Some interference with daily activities');
      const sevDesc = getLocalizedText('severe_desc', 'Significant discomfort, difficult to work');
      const verySevDesc = getLocalizedText('very_severe_desc', 'Extreme distress requiring urgent attention');

      const isMild = currentAnswer === 'Mild' ? ' selected mild' : '';
      const isMod = currentAnswer === 'Moderate' ? ' selected moderate' : '';
      const isSev = currentAnswer === 'Severe' ? ' selected severe' : '';
      const isVerySev = currentAnswer === 'Very Severe' ? ' selected very-severe' : '';

      optionsHtml = `<div class="severity-ratings-grid" style="margin-bottom:24px;">
        <div class="severity-card level-mild${isMild}" tabindex="0" role="button" aria-label="${mildLabel}: ${mildDesc}" onclick="App.answerAQ('Mild')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">
          <h3>${mildLabel}</h3>
          <p>${mildDesc}</p>
        </div>
        <div class="severity-card level-moderate${isMod}" tabindex="0" role="button" aria-label="${modLabel}: ${modDesc}" onclick="App.answerAQ('Moderate')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">
          <h3>${modLabel}</h3>
          <p>${modDesc}</p>
        </div>
        <div class="severity-card level-severe${isSev}" tabindex="0" role="button" aria-label="${sevLabel}: ${sevDesc}" onclick="App.answerAQ('Severe')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">
          <h3>${sevLabel}</h3>
          <p>${sevDesc}</p>
        </div>
        <div class="severity-card level-very-severe${isVerySev}" tabindex="0" role="button" aria-label="${verySevLabel}: ${verySevDesc}" onclick="App.answerAQ('Very Severe')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">
          <h3>${verySevLabel}</h3>
          <p>${verySevDesc}</p>
        </div>
      </div>`;

    } else if (q.type === 'text') {
      const textVal = currentAnswer || '';
      optionsHtml = `<div style="margin-bottom:24px;">
        <textarea id="aq-free-text" class="kiosk-input" style="height:110px;font-size:1.05rem;text-align:left;resize:none;" placeholder="${getLocalizedText('type_your_problem', 'Type what you are feeling...')}">${textVal}</textarea>
        <div style="display:flex;gap:10px;margin-top:12px;">
          <button class="btn-kiosk-secondary" onclick="App.triggerAQVoice()" style="width:50%;">
            <i class="fa-solid fa-microphone"></i> ${getLocalizedText('speak', 'Speak')}
          </button>
          <button class="btn-kiosk-primary" onclick="App.answerAQText()" style="width:50%;">
            ${getLocalizedText('continue', 'Continue')} <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>`;
    } else {
      // options or yesno
      optionsHtml = `<div class="options-vertical-list">` +
        q.options.map(opt => {
          const isSel = (currentAnswer === opt) ? ' selected' : '';
          return `<button class="option-touch-btn${isSel}" onclick="App.answerAQ('${opt.replace(/'/g,"\\'")}')">
            <span>${getLocalizedText(opt, opt)}</span> <i class="fa-solid fa-chevron-right"></i>
          </button>`;
        }).join('') +
        `</div>`;
    }

    const qLabel = getLocalizedText('Question', 'Question');
    const ofLabel = getLocalizedText('of', 'of');
    const listenLabel = getLocalizedText('listen', 'Listen');
    const backLabel = getLocalizedText('back', 'Back');
    const helpLabel = getLocalizedText('need_help', 'Need Help?');
    
    const localizedQuestion = getLocalizedText(q.text, q.text);
    const localizedSubtitle = getLocalizedText(q.subtitle || '', q.subtitle || '');
    const currentIntent = this.state.symptomIntent || 'general';
    const localizedIntent = getLocalizedText(currentIntent, this.state.chiefComplaint || 'Clinical Intake');

    container.innerHTML = `
      <div class="ms-kiosk-split">
        <!-- LEFT COLUMN: CONTEXT, HEADLINE, PROGRESS -->
        <div class="ms-kiosk-left">
          <div class="ms-eyebrow">
            <span style="color:var(--orange);font-weight:800;">●</span>
            ${localizedIntent.toUpperCase()} · ${qLabel.toUpperCase()} ${current} ${ofLabel.toUpperCase()} ${total}
          </div>
          
          <div class="aq-progress-bar-wrap" style="margin:8px 0 20px;">
            <div class="aq-progress-fill" style="width:${(current/total)*100}%;"></div>
          </div>

          <h2 class="ms-headline" id="aq-q-text">
            ${localizedQuestion}
          </h2>
          
          ${localizedSubtitle ? `<p class="ms-subline">${localizedSubtitle}</p>` : ''}

          <div style="display:flex;align-items:center;gap:14px;margin-top:16px;">
            <button class="btn-outline" style="height:40px;padding:0 16px;font-size:0.84rem;" onclick="speakText(document.getElementById('aq-q-text').innerText)">
              <i class="fa-solid fa-volume-high"></i> ${listenLabel}
            </button>
          </div>

          <div class="ms-nav" style="margin-top:40px;padding-top:18px;">
            <button class="btn-ghost" onclick="App.prevAQ()"><i class="fa-solid fa-arrow-left"></i> ${backLabel}</button>
            <button class="btn-help-link" onclick="App.toggleHelpModal()"><i class="fa-solid fa-circle-question"></i> ${helpLabel}</button>
          </div>
        </div>

        <!-- RIGHT COLUMN: LARGE TOUCH TARGETS -->
        <div class="ms-kiosk-right">
          ${optionsHtml}
        </div>
      </div>
    `;

    this.showScreen(20, options);
    if (!options.isRestoring && !options.suppressSpeech) {
      setTimeout(() => speakText(localizedQuestion), 300);
    }
  },

  renderBodyMapHTML(q) {
    const selectedLabel = getLocalizedText('selected_area', 'Selected Area');
    const continueLabel = getLocalizedText('continue', 'Continue');

    const primaryZones = [
      { id: 'Head', labelKey: 'head', fallback: 'Head', icon: 'fa-brain' },
      { id: 'Chest', labelKey: 'chest', fallback: 'Chest', icon: 'fa-heart-pulse' },
      { id: 'Abdomen', labelKey: 'abdomen', fallback: 'Abdomen', icon: 'fa-lungs' },
      { id: 'Arms', labelKey: 'arms', fallback: 'Arms', icon: 'fa-hand' },
      { id: 'Legs', labelKey: 'legs', fallback: 'Legs', icon: 'fa-person-walking' },
      { id: 'Back', labelKey: 'back', fallback: 'Back', icon: 'fa-child-reaching' }
    ];

    const abdomenSubzones = [
      'Upper Abdomen', 'Around Navel', 'Lower Abdomen', 'Left Side', 'Right Side'
    ];

    const isStomachFlow = (this.state.symptomIntent === 'stomach_pain');

    return `
      <div class="body-location-wrapper">
        <div class="body-silhouette-card">
          <svg width="210" height="270" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
            <!-- Head & Neck -->
            <ellipse id="svg-zone-head" cx="100" cy="36" rx="20" ry="24" fill="#0f4c5c" opacity="0.18" stroke="#0a3641" stroke-width="2" style="cursor:pointer;" tabindex="0" role="button" aria-label="Select Head" onclick="App.selectBodyZoneAQ('Head')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}"/>
            <rect x="92" y="58" width="16" height="12" fill="#cbd5e1"/>
            
            <!-- Torso Frame -->
            <path d="M62 70 L138 70 L146 148 L138 240 L62 240 L54 148 Z" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5"/>

            <!-- Chest Zone -->
            <rect id="svg-zone-chest" x="72" y="72" width="56" height="38" rx="4" fill="#0f4c5c" opacity="0.18" stroke="#0a3641" stroke-width="2" style="cursor:pointer;" tabindex="0" role="button" aria-label="Select Chest" onclick="App.selectBodyZoneAQ('Chest')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}"/>
            
            <!-- Abdomen Zone (or subzones) -->
            <rect id="svg-zone-abdomen" x="74" y="114" width="52" height="46" rx="4" fill="#0f4c5c" opacity="0.18" stroke="#0a3641" stroke-width="2" style="cursor:pointer;" tabindex="0" role="button" aria-label="Select Abdomen" onclick="App.selectBodyZoneAQ('Abdomen')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}"/>

            <!-- Arms -->
            <path id="svg-zone-arms-l" d="M62 76 L38 150 L48 152 L70 84 Z" fill="#0f4c5c" opacity="0.18" stroke="#0a3641" stroke-width="2" style="cursor:pointer;" tabindex="0" role="button" aria-label="Select Left Arm" onclick="App.selectBodyZoneAQ('Arms')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}"/>
            <path id="svg-zone-arms-r" d="M138 76 L162 150 L152 152 L130 84 Z" fill="#0f4c5c" opacity="0.18" stroke="#0a3641" stroke-width="2" style="cursor:pointer;" tabindex="0" role="button" aria-label="Select Right Arm" onclick="App.selectBodyZoneAQ('Arms')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}"/>

            <!-- Legs -->
            <rect id="svg-zone-legs-l" x="74" y="165" width="22" height="85" rx="4" fill="#0f4c5c" opacity="0.18" stroke="#0a3641" stroke-width="2" style="cursor:pointer;" tabindex="0" role="button" aria-label="Select Left Leg" onclick="App.selectBodyZoneAQ('Legs')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}"/>
            <rect id="svg-zone-legs-r" x="104" y="165" width="22" height="85" rx="4" fill="#0f4c5c" opacity="0.18" stroke="#0a3641" stroke-width="2" style="cursor:pointer;" tabindex="0" role="button" aria-label="Select Right Leg" onclick="App.selectBodyZoneAQ('Legs')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}"/>


            <!-- Region Labels for Clarity -->
            <text x="100" y="38" text-anchor="middle" font-size="8.5" font-weight="700" fill="#0a3641">${getLocalizedText('head', 'Head')}</text>
            <text x="100" y="92" text-anchor="middle" font-size="8.5" font-weight="700" fill="#0a3641">${getLocalizedText('chest', 'Chest')}</text>
            <text x="100" y="139" text-anchor="middle" font-size="8.5" font-weight="700" fill="#0a3641">${getLocalizedText('abdomen', 'Abdomen')}</text>
            <text x="100" y="200" text-anchor="middle" font-size="8.5" font-weight="700" fill="#0a3641">${getLocalizedText('legs', 'Legs')}</text>
          </svg>
        </div>

        <div>
          <div class="body-zones-grid" style="margin-bottom:14px;">
            ${primaryZones.map(z => `
              <button class="zone-select-btn" id="zone-btn-${z.id}" onclick="App.selectBodyZoneAQ('${z.id}')">
                <span><i class="fa-solid ${z.icon}" style="margin-right:8px;color:var(--teal-primary);"></i> ${getLocalizedText(z.labelKey, z.fallback)}</span>
                <i class="fa-solid fa-chevron-right" style="font-size:0.85rem;"></i>
              </button>
            `).join('')}
          </div>

          ${isStomachFlow ? `
            <div style="background:var(--bg-kiosk);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:12px;margin-bottom:14px;">
              <p style="font-size:0.85rem;font-weight:700;color:var(--teal-deep);margin-bottom:8px;">
                Specific abdominal location:
              </p>
              <div style="display:flex;flex-wrap:wrap;gap:8px;">
                ${abdomenSubzones.map(sub => `
                  <button class="zone-select-btn" id="zone-btn-${sub.replace(/\s+/g,'-')}" style="min-height:38px;padding:6px 12px;font-size:0.88rem;" onclick="App.selectBodyZoneAQ('${sub}')">
                    ${getLocalizedText(sub, sub)}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div id="zone-selected-display" style="background:var(--orange-soft);border:1.5px solid var(--orange-primary);padding:12px 18px;border-radius:var(--radius-sm);font-weight:700;display:none;align-items:center;justify-content:space-between;">
            <div>
              <span style="font-size:0.85rem;color:var(--text-muted);display:block;">${selectedLabel}</span>
              <span id="zone-selected-text" style="color:var(--teal-deepest);font-size:1.15rem;font-weight:800;">—</span>
            </div>
            <button class="btn-kiosk-primary" onclick="App.continueAfterBodyMap()" style="min-height:44px;padding:6px 20px;font-size:1rem;">
              ${continueLabel} <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  },
  
  selectBodyZoneAQ(zoneName) {
    this.state.bodyLocation = zoneName;
    const translatedZone = getLocalizedText(zoneName, zoneName);

    // Update zone button highlights
    document.querySelectorAll('.zone-select-btn').forEach(btn => {
      const match = btn.innerText.trim().includes(translatedZone) || btn.innerText.trim().includes(zoneName);
      btn.classList.toggle('active', match);
    });

    // Update display banner
    const display = document.getElementById('zone-selected-display');
    const textEl = document.getElementById('zone-selected-text');
    if (display && textEl) {
      textEl.innerText = translatedZone;
      display.style.display = 'flex';
    }

    // Reset SVG opacities
    ['svg-zone-head','svg-zone-chest','svg-zone-abdomen','svg-zone-arms-l','svg-zone-arms-r','svg-zone-legs-l','svg-zone-legs-r'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.setAttribute('opacity','0.18');
        el.setAttribute('fill','#0f4c5c');
      }
    });

    // Highlight target zone in warm orange
    const highlightZone = (ids) => {
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.setAttribute('opacity','0.75');
          el.setAttribute('fill','#ea580c');
        }
      });
    };

    if (zoneName === 'Head') highlightZone(['svg-zone-head']);
    else if (zoneName === 'Chest') highlightZone(['svg-zone-chest']);
    else if (zoneName === 'Abdomen' || zoneName.includes('Abdomen') || zoneName.includes('Navel') || zoneName.includes('Side')) highlightZone(['svg-zone-abdomen']);
    else if (zoneName === 'Arms') highlightZone(['svg-zone-arms-l','svg-zone-arms-r']);
    else if (zoneName === 'Legs') highlightZone(['svg-zone-legs-l','svg-zone-legs-r']);

    this.logMsg("Patient", `Pain location: ${zoneName}`);
  },

  continueAfterBodyMap() {
    if (!this.state.bodyLocation || this.state.bodyLocation === "Not specified") {
      this.showNotification("⚠️ " + getLocalizedText('body_map_title', 'Please select a location on the diagram.'));
      return;
    }
    this.aqAnswers['sp_location'] = this.state.bodyLocation;
    this.aqIndex++;
    this.showAdaptiveQuestion();
  },

  answerAQ(answer) {
    const q = this.aqFlow[this.aqIndex];
    this.aqAnswers[q.id] = answer;
    // Change 17: Log each Q&A in the conversation log with localized texts
    const localQ = getLocalizedText(q.text, q.text);
    const localA = getLocalizedText(answer, answer);
    this.logMsg('MediSarthi', localQ);
    this.logMsg('Patient', localA);
    // Highlight selected button briefly
    const translatedAnswer = getLocalizedText(answer, answer);
    document.querySelectorAll('.option-touch-btn').forEach(btn => {
      if (btn.innerText.trim().startsWith(translatedAnswer.substring(0,15)) || btn.innerText.trim().startsWith(answer.substring(0,15))) btn.classList.add('selected');
    });
    document.querySelectorAll('.severity-card').forEach(c => {
      const h3 = c.querySelector('h3');
      if (h3 && (h3.innerText.includes(translatedAnswer.split(' ')[0]) || h3.innerText.includes(answer.split(' ')[0]))) {
        c.classList.add('selected', answer.toLowerCase());
      }
    });
    setTimeout(() => {
      this.aqIndex++;
      // Change 5: Skip irrelevant follow-up questions based on previous answers
      this.skipIrrelevantQuestions();
      this.showAdaptiveQuestion();
    }, 350);
  },

  answerAQText() {
    const textarea = document.getElementById('aq-free-text');
    const val = textarea ? textarea.value.trim() : '';
    if (!val) { this.showNotification("⚠️ Please type or speak something."); return; }
    const q = this.aqFlow[this.aqIndex];
    this.aqAnswers[q.id] = val;
    this.state.chiefComplaint = val.length > 40 ? val.substring(0,40)+'...' : val;
    this.logMsg("Patient", val);
    this.aqIndex++;
    this.showAdaptiveQuestion();
  },

  triggerAQVoice() {
    const textarea = document.getElementById('aq-free-text');
    VoiceController.startListening(
      (transcript, isFinal) => {
        if (textarea) textarea.value = transcript;
        if (isFinal) VoiceController.stopListening();
      },
      () => {}
    );
  },

  prevAQ() {
    if (this.aqIndex <= 0) {
      this.aqIndex = 0;
      this.showScreen(6);
      return;
    }
    this.aqIndex--;
    while (this.aqIndex > 0 && this.shouldSkipQuestion(this.aqFlow[this.aqIndex])) {
      this.aqIndex--;
    }
    this.showAdaptiveQuestion();
  },

  prevAQFromSummary() {
    if (!this.aqFlow || this.aqFlow.length === 0) {
      this.showScreen(6);
      return;
    }
    this.aqIndex = this.aqFlow.length - 1;
    while (this.aqIndex > 0 && this.shouldSkipQuestion(this.aqFlow[this.aqIndex])) {
      this.aqIndex--;
    }
    this.showAdaptiveQuestion();
  },

  /**
   * Change 5: Conditional/Adaptive questioning — skip irrelevant questions.
   * Based on prior answers, advance aqIndex past questions that are not relevant.
   */
  skipIrrelevantQuestions() {
    while (this.aqIndex < this.aqFlow.length) {
      const q = this.aqFlow[this.aqIndex];
      if (!this.shouldSkipQuestion(q)) break;
      this.aqIndex++;
    }
  },

  shouldSkipQuestion(q) {
    const a = this.aqAnswers;
    const intent = this.state.symptomIntent;
    const secondary = this.state.secondaryIntents || [];

    // 1. HEADACHE PATHWAY: Do NOT ask bowel questions or cough questions unless explicitly mentioned
    if (intent === 'headache' && !secondary.includes('cough_cold') && !secondary.includes('stomach_pain')) {
      if (q.id === 'sp_bowel' || q.id === 'sp_eating' || q.id === 'cc_throat' || q.id === 'cc_breathing' || q.id === 'cc_type' || q.id === 'cc_cold_contact') return true;
    }

    // 2. FEVER PATHWAY: Do NOT ask bowel questions unless stomach pain reported; skip cough details if patient said no cough
    if (intent === 'fever') {
      if (q.id === 'sp_bowel' && !a.fv_vomiting?.includes('Loose') && !secondary.includes('stomach_pain')) {
        return true; // Skip bowel question for fever unless diarrhea/stomach pain mentioned
      }
      if (a.fv_cough && (a.fv_cough === 'No cough' || a.fv_cough.startsWith('No') || a.fv_cough.includes('नहीं') || a.fv_cough.includes('नाही'))) {
        if (q.id === 'cc_type' || q.id === 'cc_throat' || q.id === 'cc_breathing') return true;
      }
    }

    // 3. COUGH PATHWAY: Do NOT ask stomach pain / bowel questions
    if (intent === 'cough_cold' && !secondary.includes('stomach_pain')) {
      if (q.id === 'sp_bowel' || q.id === 'sp_location' || q.id === 'sp_eating') return true;
      if (a.cc_breathing && (a.cc_breathing.includes('fine') || a.cc_breathing.includes('ठीक') || a.cc_breathing.includes('नाही'))) {
        if (q.id === 'cc_chest_pain') return true;
      }
    }

    // 4. STOMACH PAIN PATHWAY: Do NOT ask sore throat / cough questions
    if (intent === 'stomach_pain' && !secondary.includes('cough_cold')) {
      if (q.id === 'cc_throat' || q.id === 'cc_type' || q.id === 'cc_breathing') return true;
    }

    return false; // Default: show question
  },

  // ── AYUSH MULTI-QUESTION SURVEY ───────────────────────────────────────────
  setAyushOption(wantsAyush) {
    if (!wantsAyush) {
      this.state.ayushRequested = false;
      this.showScreen(14);
      return;
    }
    this.state.ayushRequested = true;
    this.ayushIndex = 0;
    this.ayushAnswers = {};
    this.showAyushQuestion();
  },

  showAyushQuestion(options = {}) {
    if (this.ayushIndex >= this.ayushQuestions.length) {
      // AYUSH complete
      this.state.ayushAnswers = { ...this.ayushAnswers };
      this.renderAyushSummary();
      this.showScreen(16, options); // Navigate to AYUSH Summary Screen (step-16)
      return;
    }
    const q = this.ayushQuestions[this.ayushIndex];
    const total = this.ayushQuestions.length;
    const current = this.ayushIndex + 1;

    const container = document.getElementById('ayush-container');
    if (!container) return;

    const ayushQLabel = getLocalizedText('AYUSH Question', 'AYUSH Question');
    const ofLabel = getLocalizedText('of', 'of');
    const listenLabel = getLocalizedText('listen', 'Listen');
    const backLabel = getLocalizedText('back', 'Back');
    const skipLabel = getLocalizedText('Skip for now', 'Skip for now');
    const helpLabel = getLocalizedText('need_help', 'Need Help?');
    
    const localizedQuestion = getLocalizedText(q.text, q.text);
    const localizedSubtitle = getLocalizedText(q.subtitle || '', q.subtitle || '');

    let bodyContent = '';
    const currentAyushAns = this.ayushAnswers[q.id];
    if (q.type === 'options') {
      bodyContent = `<div class="options-vertical-list">
        ${q.options.map(opt => {
          const isSel = (currentAyushAns === opt) ? ' selected' : '';
          return `<button class="option-touch-btn${isSel}" onclick="App.answerAyush('${opt.replace(/'/g,"\\'")}')">
            <span>${getLocalizedText(opt, opt)}</span> <i class="fa-solid fa-chevron-right"></i>
          </button>`;
        }).join('')}
      </div>`;
    } else {
      const placeholderText = getLocalizedText('Type any lifestyle habit or concern...', 'Type any lifestyle habit or concern...');
      const continueBtnText = getLocalizedText('Save & Continue', 'Save & Continue');
      const speakLabel = getLocalizedText('speak', 'Speak');
      const existingVal = this.ayushAnswers[q.id] || '';

      bodyContent = `<div style="margin-bottom:20px;">
        <textarea id="ayush-free-text" class="kiosk-input" style="height:110px;font-size:1.05rem;text-align:left;resize:none;" placeholder="${placeholderText}">${existingVal}</textarea>
        <div style="display:flex;gap:12px;margin-top:14px;flex-wrap:wrap;">
          <button class="btn-kiosk-secondary" style="flex:1;min-width:140px;" onclick="App.toggleAyushVoiceInput()">
            <i class="fa-solid fa-microphone"></i> ${speakLabel}
          </button>
          <button class="btn-kiosk-primary" style="flex:2;min-width:180px;" onclick="App.answerAyushText()">
            ${continueBtnText} <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>`;
    }

    container.innerHTML = `
      <div class="ms-kiosk-split">
        <div class="ms-kiosk-left">
          <div class="ms-eyebrow">
            <span style="color:#059669;font-weight:800;">🌿</span>
            ${ayushQLabel.toUpperCase()} · ${current} ${ofLabel.toUpperCase()} ${total}
          </div>

          <div class="aq-progress-bar-wrap" style="margin:8px 0 20px;">
            <div class="aq-progress-fill" style="width:${(current/total)*100}%;background:#059669;"></div>
          </div>

          <h2 class="ms-headline" id="ayush-q-text">
            ${localizedQuestion}
          </h2>
          
          ${localizedSubtitle ? `<p class="ms-subline">${localizedSubtitle}</p>` : ''}

          <div style="display:flex;align-items:center;gap:14px;margin-top:16px;">
            <button class="btn-outline" style="height:40px;padding:0 16px;font-size:0.84rem;" onclick="speakText(document.getElementById('ayush-q-text').innerText)">
              <i class="fa-solid fa-volume-high"></i> ${listenLabel}
            </button>
            <button class="btn-ghost" style="font-size:0.84rem;" onclick="App.skipAyush()">
              <i class="fa-solid fa-forward"></i> ${skipLabel}
            </button>
          </div>

          <div class="ms-nav" style="margin-top:40px;padding-top:18px;">
            <button class="btn-ghost" onclick="App.prevAyush()"><i class="fa-solid fa-arrow-left"></i> ${backLabel}</button>
            <button class="btn-help-link" onclick="App.toggleHelpModal()"><i class="fa-solid fa-circle-question"></i> ${helpLabel}</button>
          </div>
        </div>

        <div class="ms-kiosk-right">
          ${bodyContent}
        </div>
      </div>
    `;

    this.showScreen(17, options);
    if (!options.isRestoring && !options.suppressSpeech) {
      setTimeout(() => speakText(localizedQuestion), 300);
    }
  },

  skipAyush() {
    const q = this.ayushQuestions[this.ayushIndex];
    delete this.ayushAnswers[q.id];
    this.ayushIndex++;
    this.showAyushQuestion();
  },

  answerAyush(answer) {
    const q = this.ayushQuestions[this.ayushIndex];
    this.ayushAnswers[q.id] = answer;
    this.logMsg("Patient", `AYUSH – ${q.title || q.text}: ${answer}`);
    setTimeout(() => {
      this.ayushIndex++;
      this.showAyushQuestion();
    }, 250);
  },

  answerAyushText() {
    const q = this.ayushQuestions[this.ayushIndex];
    const txt = document.getElementById('ayush-free-text')?.value.trim();
    if (txt) {
      this.ayushAnswers[q.id] = txt;
      this.logMsg("Patient", `AYUSH – ${q.title || q.text}: ${txt}`);
    } else {
      delete this.ayushAnswers[q.id];
    }
    this.ayushIndex++;
    this.showAyushQuestion();
  },

  toggleAyushVoiceInput() {
    const textarea = document.getElementById('ayush-free-text');
    if (!textarea) return;
    VoiceController.setLanguage(this.currentLang);
    VoiceController.startListening((transcript, isFinal) => {
      textarea.value = transcript;
    }, (isListening) => {
      if (isListening) this.showNotification('🎤 Listening for voice input...');
    });
  },

  prevAyush() {
    if (this.ayushIndex <= 0) {
      this.ayushIndex = 0;
      this.showScreen(13);
      return;
    }
    this.ayushIndex--;
    this.showAyushQuestion();
  },

  prevAyushFromSummary() {
    if (!this.ayushQuestions || this.ayushQuestions.length === 0) {
      this.showScreen(13);
      return;
    }
    this.ayushIndex = this.ayushQuestions.length - 1;
    this.showAyushQuestion();
  },

  prevFromReports() {
    if (this.state.ayushRequested) {
      this.showScreen(16);
    } else {
      this.showScreen(13);
    }
  },

  renderAyushSummary() {
    const container = document.getElementById('ayush-summary-container');
    if (!container) return;
    const q = this.ayushQuestions;
    const answeredItems = q.filter(item => this.ayushAnswers[item.id]);

    let rowsHtml = '';
    if (answeredItems.length === 0) {
      rowsHtml = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-style:italic;background:#f8fafc;border-radius:var(--radius-md);margin-bottom:16px;">
        ${getLocalizedText('No wellness questions were answered (all skipped).', 'No wellness questions were answered (all skipped).')}
      </div>`;
    } else {
      rowsHtml = `<div class="summary-table-card" style="text-align:left;margin-bottom:16px;">` +
        answeredItems.map(item => {
          const val = this.ayushAnswers[item.id];
          return `<div class="summary-row">
            <div class="summary-label">${item.icon || '🌿'} ${getLocalizedText(item.title || item.text, item.title || item.text)}</div>
            <div class="summary-val">${getLocalizedText(val, val)}</div>
          </div>`;
        }).join('') + `</div>`;
    }

    const disclaimerText = getLocalizedText('This AYUSH wellness context is for holistic care reference only. It does not constitute medical diagnosis or treatment advice.', 'This AYUSH wellness context is for holistic care reference only. It does not constitute medical diagnosis or treatment advice.');

    container.innerHTML = `
      ${rowsHtml}
      <div class="ai-safety-alert" style="margin-bottom:20px;">
        <i class="fa-solid fa-leaf" style="font-size:1.3rem;color:#059669;"></i>
        ${disclaimerText}
      </div>
    `;
  },

  /**
   * Change 8 + 14: Build clinical summary dynamically from actual answered questions only.
   * Returns array of {labelKey, labelFallback, value} for each answered field.
   * Change 14: All labels and values go through getLocalizedText() so they match selected language.
   */
  buildDynamicSummaryRows() {
    const rows = [];
    const lang = this.currentLang;

    // Helper: add a row only if value is truthy and not "Not provided"
    const addRow = (labelKey, labelFallback, value) => {
      if (!value || value === 'Not provided' || value === 'Not specified') return;
      const localLabel = getLocalizedText(labelKey, labelFallback);
      const localValue = getLocalizedText(value, value);
      rows.push({ label: localLabel, value: localValue });
    };

    // Chief complaint — always shown
    const complaintLabel = getLocalizedText('chief_complaint', 'Chief Complaint');
    const complaintValue = getLocalizedText(this.state.chiefComplaint, this.state.chiefComplaint);
    rows.push({ label: complaintLabel, value: complaintValue || getLocalizedText('Not provided', 'Not provided') });

    // From answered adaptive questions
    const a = this.aqAnswers;

    // Duration
    const durationVal = a.sp_duration || a.cc_duration || a.fv_duration || a.hd_duration || a.bp_duration || a.se_duration;
    addRow('duration', 'Duration', durationVal);

    // Location
    const locationVal = this.state.bodyLocation !== 'Not specified' ? this.state.bodyLocation
      : (a.sp_location || a.hd_location || a.bp_location);
    addRow('location', 'Location', locationVal);

    // Severity
    const severityVal = a.sp_severity || a.cc_severity || a.fv_severity || a.hd_severity || a.bp_severity || a.se_severity;
    addRow('severity', 'Severity', severityVal);

    // Onset
    const onsetVal = a.sp_onset || a.hd_onset || a.fv_onset;
    addRow('onset', 'Onset', onsetVal);

    // Pathway-specific fields — only if answered
    if (a.sp_eating) addRow('aggravating_factors', 'Aggravating Factors', a.sp_eating);
    if (a.sp_nausea) addRow('associated_symptoms', 'Associated Symptoms', a.sp_nausea);
    if (a.sp_fever_associated) addRow('fever', 'Fever', a.sp_fever_associated);
    if (a.sp_bowel) addRow('bowel_changes', 'Bowel Changes', a.sp_bowel);
    if (a.sp_past_history) addRow('past_history', 'Past History', a.sp_past_history);

    if (a.cc_type) addRow('cough_type', 'Cough Type', a.cc_type);
    if (a.cc_fever) addRow('fever', 'Fever', a.cc_fever);
    if (a.cc_breathing) addRow('breathing', 'Breathing', a.cc_breathing);
    if (a.cc_throat) addRow('throat_nose', 'Throat / Nose', a.cc_throat);
    if (a.cc_chest_pain) addRow('chest_pain', 'Chest Discomfort', a.cc_chest_pain);
    if (a.cc_cold_contact) addRow('contact_history', 'Contact History', a.cc_cold_contact);

    if (a.fv_chills) addRow('chills', 'Chills / Shivering', a.fv_chills);
    if (a.fv_cough) addRow('cough_cold', 'Cough', a.fv_cough);
    if (a.fv_body_ache) addRow('body_pain', 'Body Ache', a.fv_body_ache);
    if (a.fv_rash) addRow('rash', 'Skin Rash', a.fv_rash);
    if (a.fv_vomiting) addRow('nausea_vomiting', 'Nausea / Vomiting', a.fv_vomiting);
    if (a.fv_travel) addRow('travel_history', 'Travel History', a.fv_travel);

    if (a.hd_light) addRow('light_noise_sensitivity', 'Light / Noise Sensitivity', a.hd_light);
    if (a.hd_nausea) addRow('nausea_vomiting', 'Nausea / Vomiting', a.hd_nausea);
    if (a.hd_vision) addRow('vision_changes', 'Vision Changes', a.hd_vision);
    if (a.hd_trigger) addRow('trigger', 'Trigger', a.hd_trigger);
    if (a.hd_previous) addRow('past_history', 'Past History', a.hd_previous);

    if (a.bp_fever) addRow('fever', 'Fever', a.bp_fever);
    if (a.bp_swelling) addRow('swelling', 'Swelling', a.bp_swelling);
    if (a.bp_activity) addRow('movement_effect', 'Effect of Movement', a.bp_activity);

    if (a.se_problem) addRow('description', 'Description', a.se_problem);
    if (a.se_other_symptoms) addRow('associated_symptoms', 'Associated Symptoms', a.se_other_symptoms);
    if (a.se_history) addRow('past_history', 'Past History', a.se_history);

    // Allergies (from profile step)
    const allergies = this.state.allergies;
    if (allergies && allergies !== 'None' && allergies.toLowerCase() !== 'no known allergies') {
      const allergyLabel = getLocalizedText('allergies', 'Allergies');
      const allergyVal = getLocalizedText(allergies, allergies);
      rows.push({ label: allergyLabel, value: allergyVal });
    } else if (allergies) {
      const allergyLabel = getLocalizedText('allergies', 'Allergies');
      rows.push({ label: allergyLabel, value: getLocalizedText(allergies, allergies) });
    }

    // Medical documents
    const docsLabel = getLocalizedText('medical_documents', 'Medical Documents');
    if (this.state.reportsUploaded && this.state.reportsUploaded.length > 0) {
      const countText = getLocalizedText('reports_uploaded_count', `${this.state.reportsUploaded.length} report(s) uploaded`);
      rows.push({ label: docsLabel, value: `${this.state.reportsUploaded.length} — ` + this.state.reportsUploaded.map(r => r.title).join(', ') });
    } else {
      rows.push({ label: docsLabel, value: getLocalizedText('no_reports_yet', 'No reports uploaded yet.') });
    }

    return rows;
  },

  // Change 8+14: Update summary card dynamically as clean Patient Story
  updateSummaryCard() {
    const container = document.getElementById('dynamic-summary-container');
    if (!container) return;

    const a = this.aqAnswers;
    const addField = (labelKey, fallback, val) => {
      if (!val || val === 'Not provided' || val === 'Not specified') return '';
      return `<div class="summary-row">
        <div class="summary-label">${getLocalizedText(labelKey, fallback)}</div>
        <div class="summary-val">${getLocalizedText(val, val)}</div>
      </div>`;
    };

    // 1. TODAY'S VISIT
    const visitRows = [];
    visitRows.push(addField('main_concern', 'Main Concern', this.state.chiefComplaint));
    const durationVal = a.sp_duration || a.cc_duration || a.fv_duration || a.hd_duration || a.bp_duration || a.se_duration;
    visitRows.push(addField('duration', 'Duration', durationVal));
    const locationVal = (this.state.bodyLocation !== 'Not specified' ? this.state.bodyLocation : (a.sp_location || a.hd_location || a.bp_location));
    visitRows.push(addField('location', 'Location', locationVal));
    const severityVal = a.sp_severity || a.cc_severity || a.fv_severity || a.hd_severity || a.bp_severity || a.se_severity;
    visitRows.push(addField('severity', 'Severity', severityVal));
    const onsetVal = a.sp_onset || a.hd_onset || a.fv_onset;
    visitRows.push(addField('onset', 'Onset', onsetVal));
    if (a.sp_eating) visitRows.push(addField('aggravating_factors', 'Aggravating Factors', a.sp_eating));
    if (a.sp_nausea) visitRows.push(addField('associated_symptoms', 'Associated Symptoms', a.sp_nausea));
    if (a.sp_fever_associated) visitRows.push(addField('fever', 'Fever', a.sp_fever_associated));
    if (a.sp_bowel) visitRows.push(addField('bowel_changes', 'Bowel Changes', a.sp_bowel));
    if (a.cc_type) visitRows.push(addField('cough_type', 'Cough Type', a.cc_type));
    if (a.cc_breathing) visitRows.push(addField('breathing', 'Breathing', a.cc_breathing));
    if (a.fv_chills) visitRows.push(addField('chills', 'Chills', a.fv_chills));
    if (a.hd_light) visitRows.push(addField('light_noise_sensitivity', 'Sensitivity', a.hd_light));
    if (a.bp_activity) visitRows.push(addField('movement_effect', 'Movement Effect', a.bp_activity));
    if (a.se_other_symptoms) visitRows.push(addField('associated_symptoms', 'Other Symptoms', a.se_other_symptoms));

    // 2. HEALTH HISTORY
    const historyRows = [];
    if (this.state.allergies) historyRows.push(addField('allergies', 'Allergies', this.state.allergies));
    if (this.state.medications) historyRows.push(addField('current_medications', 'Current Medications', this.state.medications));
    const pastHistoryVal = a.sp_past_history || a.hd_previous || a.se_history || this.state.medicalHistory;
    if (pastHistoryVal) historyRows.push(addField('past_history', 'Past Medical History', pastHistoryVal));

    // 3. REPORTS
    const reportsRows = [];
    if (this.state.reportsUploaded && this.state.reportsUploaded.length > 0) {
      reportsRows.push(`<div class="summary-row">
        <div class="summary-label">${getLocalizedText('medical_documents', 'Uploaded Reports')}</div>
        <div class="summary-val">${this.state.reportsUploaded.map(r => r.title + ' (' + r.date + ')').join('<br>')}</div>
      </div>`);
    } else {
      reportsRows.push(`<div class="summary-row">
        <div class="summary-label">${getLocalizedText('medical_documents', 'Uploaded Reports')}</div>
        <div class="summary-val" style="color:var(--text-subtle);">${getLocalizedText('no_reports_uploaded', 'No medical reports uploaded yet.')}</div>
      </div>`);
    }

    const html = `
      <div class="patient-story-container">
        <div class="summary-story-section">
          <div class="summary-story-header">
            <i class="fa-solid fa-stethoscope"></i> ${getLocalizedText('todays_visit_title', "TODAY'S VISIT")}
          </div>
          <div class="summary-table-card">
            ${visitRows.filter(Boolean).join('')}
          </div>
        </div>

        ${historyRows.filter(Boolean).length > 0 ? `
          <div class="summary-story-section">
            <div class="summary-story-header">
              <i class="fa-solid fa-notes-medical"></i> ${getLocalizedText('health_history_title', 'HEALTH HISTORY')}
            </div>
            <div class="summary-table-card">
              ${historyRows.filter(Boolean).join('')}
            </div>
          </div>
        ` : ''}

        <div class="summary-story-section">
          <div class="summary-story-header">
            <i class="fa-solid fa-folder-open"></i> ${getLocalizedText('reports_title_summary', 'MEDICAL REPORTS')}
          </div>
          <div class="summary-table-card">
            ${reportsRows.join('')}
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  // ── REPORTS MODULE ────────────────────────────────────────────────────────
  simulateCameraScan() {
    const overlay = document.getElementById('scan-overlay');
    overlay.style.display = 'flex';
    setTimeout(() => {
      overlay.style.display = 'none';
      this.addUploadedReportItem("Photo Scan — Blood Test CBC", new Date().toLocaleDateString('en-IN'));
    }, 2500);
  },

  handleReportUpload(event) {
    const file = event.target.files[0];
    if (file) this.addUploadedReportItem(file.name, new Date().toLocaleDateString('en-IN'));
  },

  addUploadedReportItem(title, dateStr) {
    this.state.reportsUploaded.push({ title, date: dateStr, type: "pdf" });
    const container = document.getElementById('uploaded-reports-list-container');
    if (!container) return;
    const noReportsMsg = document.getElementById('no-reports-msg');
    if (noReportsMsg) noReportsMsg.style.display = 'none';

    const itemHtml = `<div class="uploaded-file-item">
      <div class="doc-file-info">
        <div class="doc-file-icon"><i class="fa-solid fa-file-waveform"></i></div>
        <div>
          <strong style="color:var(--teal-deep);font-size:1.05rem;">${title}</strong>
          <span class="doc-file-tag">${getLocalizedText('added_to_health_record', '✓ Added to health record')}</span>
          <div style="font-size:0.85rem;color:var(--text-muted);margin-top:2px;">${dateStr} · PDF Document</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn-kiosk-secondary" style="min-height:36px;padding:4px 14px;font-size:0.85rem;" onclick="App.previewReport('${title}')">
          <i class="fa-solid fa-eye"></i> View
        </button>
        <button class="btn-kiosk-secondary" style="min-height:36px;padding:4px 12px;font-size:0.85rem;border-color:#ef4444;color:#dc2626;" onclick="App.deleteReport(this,'${title}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>`;
    container.innerHTML += itemHtml;
    this.showNotification(`✅ "${title}" ${getLocalizedText('added_to_health_record', 'added to health record')}`);
  },

  deleteReport(btn, title) {
    btn.closest('.uploaded-file-item').remove();
    this.state.reportsUploaded = this.state.reportsUploaded.filter(r => r.title !== title);
  },

  previewReport(title) {
    document.getElementById('report-preview-filename').innerText = title;
    document.getElementById('report-preview-modal').classList.add('active');
  },

  closeReportPreview() {
    document.getElementById('report-preview-modal').classList.remove('active');
  },

  submitPatientFlow() {

    console.log("MediSarthi: Generating consultation token...");

    try {

        // -------------------------------------------------
        // 1. Build the patient's actual clinical summary
        // -------------------------------------------------

        const dynamicRows = this.buildDynamicSummaryRows();
        const summaryObj = this.buildClinicalSummaryForDoctor();


        // -------------------------------------------------
        // 2. Generate a REAL consultation token
        // -------------------------------------------------

        const tokenNumber =
            'A-' + Math.floor(10 + Math.random() * 90);


        // -------------------------------------------------
        // 3. Create the patient record
        // -------------------------------------------------

        const newQueuePatient = {

            id: this.state.patientId ||
               ('MS' + Math.floor(1000 + Math.random() * 9000)),

            aadhaar: this.state.aadhaar || '',

            name: this.state.fullName || 'Anonymous Patient',

            age: parseInt(this.state.age) || 0,

            gender: this.state.gender || 'Not specified',

            mobile: this.state.mobile || '',

            time: this.nowTime(),

            status: 'Waiting',

            token: tokenNumber,

            chiefComplaint:
                this.state.chiefComplaint ||
                'General Consultation',

            summary: summaryObj,

            dynamicRows: dynamicRows,

            aqAnswers: {
                ...this.aqAnswers
            },

            symptomIntent:
                this.state.symptomIntent || '',

            ayush: {

                completed:
                    this.state.ayushRequested || false,

                answers: {
                    ...(this.state.ayushAnswers || {})
                }

            },

            reports: [
                ...(this.state.reportsUploaded || [])
            ],

            conversationLog: [
                ...(this.state.conversationLog || [])
            ],

            prescriptions: [],

            doctorNotes: ''
        };


        // -------------------------------------------------
        // 4. Add patient to doctor queue & update existing patients list
        // -------------------------------------------------

        const queue = this.getStoredQueue();

        queue.unshift(newQueuePatient);

        // Update/Sync stored existing patients record
        if (this.state.aadhaar) {
          const existingList = this.getStoredExistingPatients();
          const cleanAadhaar = this.state.aadhaar.replace(/\D/g, '');
          const existingIdx = existingList.findIndex(p => p.aadhaar && p.aadhaar.replace(/\D/g, '') === cleanAadhaar);
          const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          if (existingIdx >= 0) {
            existingList[existingIdx].lastVisit = todayStr;
          } else {
            existingList.push({
              id: newQueuePatient.id,
              aadhaar: cleanAadhaar,
              name: newQueuePatient.name,
              age: newQueuePatient.age,
              gender: newQueuePatient.gender,
              mobile: newQueuePatient.mobile,
              lastVisit: todayStr,
              medicalHistory: this.state.medicalHistory || 'None known',
              allergies: this.state.allergies || 'None',
              medications: this.state.medications || 'None'
            });
          }
          this.saveStoredExistingPatients(existingList);
        }

        this.saveStoredQueue(queue);

        if (typeof DEMO_DATA !== 'undefined') {
            DEMO_DATA.patientQueue = queue;
        }


        // -------------------------------------------------
        // 5. Put generated token on the token screen
        // -------------------------------------------------

        const tokenElement =
            document.getElementById('issued-token-number');

        if (tokenElement) {
            tokenElement.textContent = tokenNumber;
        }


        // -------------------------------------------------
        // 6. Update patient information on token screen
        // -------------------------------------------------

        const tokenScreen =
            document.getElementById('step-15');

        if (tokenScreen) {

            const tokenName =
                tokenScreen.querySelector('.token-patient-name');

            if (tokenName) {
                tokenName.textContent =
                    this.state.fullName || 'Patient';
            }
        }


        // -------------------------------------------------
        // 7. Refresh doctor queue if doctor view exists
        // -------------------------------------------------

        if (
            document.getElementById('doc-queue-list') &&
            typeof this.renderDoctorQueue === 'function'
        ) {
            this.renderDoctorQueue();
        }


        // -------------------------------------------------
        // 8. FINALLY move to token screen
        // -------------------------------------------------

        console.log(
            "MediSarthi: Consultation token generated:",
            tokenNumber
        );

        this.showScreen(15);

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });


    } catch (error) {

        console.error(
            "MediSarthi: Token generation failed:",
            error
        );

        alert(
            "Something went wrong while generating your consultation token. Please try again."
        );

    }
},

  // Change 16: Build structured summary from actual aqAnswers for the doctor
  buildClinicalSummaryForDoctor() {
    const a = this.aqAnswers;
    const getSF = (keys) => {
      const k = Object.keys(a).find(k => keys.some(s => k.includes(s)));
      return k ? a[k] : null;
    };
    const locVal = (val) => val ? getLocalizedText(val, val) : null;

    const durationVal = a.sp_duration || a.cc_duration || a.fv_duration || a.hd_duration || a.bp_duration || a.se_duration || null;
    const severityVal = a.sp_severity || a.cc_severity || a.fv_severity || a.hd_severity || a.bp_severity || a.se_severity || null;
    const onsetVal = a.sp_onset || a.hd_onset || a.fv_onset || null;
    const locationVal = this.state.bodyLocation !== 'Not specified' ? this.state.bodyLocation : (a.sp_location || a.hd_location || a.bp_location || null);

    return {
      problem: this.state.chiefComplaint,
      duration: durationVal,
      severity: severityVal,
      location: locationVal,
      onset: onsetVal,
      eatingWorse: a.sp_eating || a.hd_trigger || a.bp_activity || null,
      nauseaVomiting: a.sp_nausea || a.hd_nausea || a.fv_vomiting || null,
      bowel: a.sp_bowel || null,
      pastHistory: a.sp_past_history || a.hd_previous || a.bp_activity || null,
      chills: a.fv_chills || null,
      cough: a.fv_cough || a.cc_type || null,
      bodyAche: a.fv_body_ache || null,
      rash: a.fv_rash || null,
      breathing: a.cc_breathing || null,
      throat: a.cc_throat || null,
      medications: this.state.medications || null,
      allergies: this.state.allergies || null,
      medicalHistory: this.state.medicalHistory || null,
      documents: this.state.reportsUploaded && this.state.reportsUploaded.length > 0
        ? `${this.state.reportsUploaded.length} report(s): ` + this.state.reportsUploaded.map(r => r.title).join(', ')
        : null
    };
  },

  // ── DOCTOR PORTAL ─────────────────────────────────────────────────────────
  loginDoctor() {
    const docIdEl = document.getElementById('doc-login-id');
    const docPassEl = document.getElementById('doc-login-pass');
    const errorMsgEl = document.getElementById('login-error-msg');

    if (!docIdEl || !docPassEl) {
      if (sessionStorage.getItem('medisarthi_doc_auth') === 'true') {
        window.location.href = 'doctor.html';
      } else {
        window.location.href = 'doctor-login.html';
      }
      return;
    }

    const docId = docIdEl.value.trim();
    const docPass = docPassEl.value.trim();

    if (docId === 'DR-MEDISARTHI' && docPass === 'SIH2026@Doctor') {
      if (errorMsgEl) errorMsgEl.style.display = 'none';
      sessionStorage.setItem('medisarthi_doc_auth', 'true');
      window.location.href = 'doctor.html';
    } else {
      if (errorMsgEl) {
        errorMsgEl.innerText = '❌ Invalid Doctor ID or Password. Please check credentials.';
        errorMsgEl.style.display = 'block';
      }
    }
  },

  logoutDoctor() {
    sessionStorage.removeItem('medisarthi_doc_auth');
    window.location.href = 'doctor-login.html';
  },

  renderDoctorQueue() {
    const queueList = document.getElementById('doc-queue-list');
    if (!queueList) return;
    const statusColor = { 'Completed':'#10b981','In Consultation':'#0284c7','Waiting':'#f59e0b' };
    queueList.innerHTML = DEMO_DATA.patientQueue.map(p => `
      <div class="queue-patient-card ${this.activeDoctorPatient?.id === p.id ? 'active' : ''}" onclick="App.selectDoctorPatient('${p.id}')">
        <div style="display:flex;justify-content:space-between;font-weight:700;">
          <span>${p.name}</span>
          <span style="font-size:0.75rem;background:${statusColor[p.status]||'#94a3b8'};color:white;padding:2px 8px;border-radius:99px;">${p.status}</span>
        </div>
        <div style="font-size:0.83rem;color:var(--text-muted);margin-top:4px;">
          ${p.age}y ${p.gender[0]} · ${p.chiefComplaint} · ${p.time}
        </div>
      </div>
    `).join('');
    // Update stat cards
    const q = DEMO_DATA.patientQueue;
    const setStatEl = (id, val) => { const e = document.getElementById(id); if(e) e.innerText = val; };
    setStatEl('stat-total', q.length);
    setStatEl('stat-waiting', q.filter(p=>p.status==='Waiting').length);
    setStatEl('stat-consulting', q.filter(p=>p.status==='In Consultation').length);
    setStatEl('stat-completed', q.filter(p=>p.status==='Completed').length);
  },

  filterPatientQueue(q) {
    q = q.toLowerCase();
    document.querySelectorAll('.queue-patient-card').forEach(card => {
      card.style.display = card.innerText.toLowerCase().includes(q) ? 'block' : 'none';
    });
  },

  selectDoctorPatient(patientId) {
    const p = DEMO_DATA.patientQueue.find(item => item.id === patientId) || DEMO_DATA.patientQueue[0];
    if (!p) return;

    if (p.status === 'Waiting') {
      p.status = 'In Consultation';
      this.saveStoredQueue(DEMO_DATA.patientQueue);
    }

    this.activeDoctorPatient = p;

    const setTxt = (id, val) => { const e = document.getElementById(id); if(e) e.innerText = val; };
    setTxt('doc-patient-name', p.name);
    setTxt('doc-patient-meta', `${p.age}y ${p.gender} · ID: ${p.id} · Time: ${p.time}`);
    setTxt('doc-patient-status', p.status);

    const statusEl = document.getElementById('doc-patient-status');
    if (statusEl) {
      statusEl.style.background = { Waiting:'#fef3c7', 'In Consultation':'#dbeafe', Completed:'#dcfce7' }[p.status] || '#f3f4f6';
      statusEl.style.color = { Waiting:'#92400e', 'In Consultation':'#1e40af', Completed:'#166534' }[p.status] || '#374151';
    }

    const banner = document.getElementById('completion-banner');
    if (banner) {
      banner.style.display = p.status === 'Completed' ? 'block' : 'none';
    }

    const s = p.summary || {};
    const setV = (id, val) => { const e = document.getElementById(id); if(e) e.innerText = val || getLocalizedText('Not provided', 'Not provided'); };
    setV('doc-sum-complaint', s.problem || p.chiefComplaint);
    setV('doc-sum-duration', s.duration);
    setV('doc-sum-location', s.location);
    setV('doc-sum-severity', s.severity);
    setV('doc-sum-onset', s.onset);
    setV('doc-sum-eating', s.eatingWorse);
    setV('doc-sum-nausea', s.nauseaVomiting);
    setV('doc-sum-bowel', s.bowel || s.chills || null);  // Show chills if fever pathway
    setV('doc-sum-past', s.pastHistory);
    setV('doc-sum-meds', s.medications || getLocalizedText('Not provided', 'Not provided'));
    setV('doc-sum-allergies', s.allergies || getLocalizedText('Not provided', 'Not provided'));
    // Change 16: Documents reflect actual uploaded reports
    const docsDisplay = (p.reports && p.reports.length > 0)
      ? `${p.reports.length} report(s): ` + p.reports.map(r => r.title).join(', ')
      : 'No medical reports uploaded.';
    setV('doc-sum-documents', docsDisplay);
    if (p.ayush && (p.ayush.completed || Object.keys(p.ayush.answers || {}).length > 0)) {
      const ansObj = p.ayush.answers || p.ayushAnswers || {};
      const parts = [];
      if (ansObj.ay_sleep) parts.push(`Sleep: ${ansObj.ay_sleep}`);
      if (ansObj.ay_routine) parts.push(`Routine: ${ansObj.ay_routine}`);
      if (ansObj.ay_food) parts.push(`Food: ${ansObj.ay_food}`);
      if (ansObj.ay_digestion) parts.push(`Digestion: ${ansObj.ay_digestion}`);
      if (ansObj.ay_activity) parts.push(`Activity: ${ansObj.ay_activity}`);
      if (ansObj.ay_stress) parts.push(`Stress: ${ansObj.ay_stress}`);
      if (ansObj.ay_wellness) parts.push(`Wellness: ${ansObj.ay_wellness}`);
      if (ansObj.ay_lifestyle_concern) parts.push(`Concern: ${ansObj.ay_lifestyle_concern}`);
      
      if (parts.length === 0 && p.ayush.sleep) parts.push(`Sleep: ${p.ayush.sleep}`);

      setV('doc-sum-ayush', parts.length > 0 ? parts.join(' · ') : 'Not answered');
    } else {
      setV('doc-sum-ayush', 'Not answered');
    }

    const notesEl = document.getElementById('doc-notes-textarea');
    if (notesEl) notesEl.value = p.doctorNotes || "";

    this.renderPrescriptionsList();

    const reportsBox = document.getElementById('doc-reports-list');
    if (reportsBox) {
      if (p.reports && p.reports.length > 0) {
        reportsBox.innerHTML = p.reports.map(r => `
          <div class="uploaded-file-item" style="margin-bottom:8px;">
            <div>
              <i class="fa-solid fa-file-medical" style="color:var(--primary);margin-right:6px;"></i>
              <strong>${r.title}</strong> — <span style="font-size:0.8rem;color:var(--text-muted);">${r.date}</span>
            </div>
            <button class="btn-kiosk-secondary" style="min-height:30px;padding:2px 10px;font-size:0.8rem;width:auto;" onclick="App.previewReport('${r.title}')">
              <i class="fa-solid fa-eye"></i> View
            </button>
          </div>
        `).join('');
      } else {
        reportsBox.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;"><i class="fa-solid fa-folder-open"></i> No reports uploaded for this patient.</p>';
      }
    }
    this.renderDoctorQueue();
  },

  renderPrescriptionsList() {
    const listTable = document.getElementById('prescriptions-list-table');
    if (!listTable || !this.activeDoctorPatient) return;
    const rxs = this.activeDoctorPatient.prescriptions || [];
    if (rxs.length === 0) {
      listTable.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No prescriptions added yet.</p>';
      return;
    }
    listTable.innerHTML = `
      <div class="table-responsive">
        <table class="prescription-input-table" style="margin-bottom:12px;">
          <thead><tr style="background:#f8fafc;">
            <th>Medicine</th><th>Dose</th><th>Frequency</th><th>Duration</th>
          </tr></thead>
          <tbody>${rxs.map((item, i) => `
            <tr>
              <td><strong>${item.name}</strong></td>
              <td>${item.dosage}</td>
              <td>${item.frequency}</td>
              <td>${item.duration || '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  addPrescriptionItem() {
    const nameEl = document.getElementById('rx-name');
    if (!nameEl) return;
    const name = nameEl.value.trim();
    const dosage = (document.getElementById('rx-dosage')?.value || '').trim();
    const freq = (document.getElementById('rx-freq')?.value || '').trim();
    const duration = (document.getElementById('rx-duration')?.value || '').trim();
    const instructions = (document.getElementById('rx-instructions')?.value || '').trim();
    if (!name) { this.showNotification('⚠️ Please enter medicine name.'); return; }
    if (!this.activeDoctorPatient.prescriptions) this.activeDoctorPatient.prescriptions = [];
    this.activeDoctorPatient.prescriptions.push({ name, dosage, frequency: freq, duration, instructions });
    ['rx-name','rx-dosage','rx-freq','rx-duration','rx-instructions'].forEach(id => {
      const el = document.getElementById(id); if(el) el.value = '';
    });
    this.saveStoredQueue(DEMO_DATA.patientQueue);
    this.renderPrescriptionsList();
    this.showNotification(`✅ "${name}" added to prescription.`);
  },

  completeDoctorConsultation() {
    if (!this.activeDoctorPatient) return;
    if (confirm(`Complete consultation for ${this.activeDoctorPatient.name}? This will mark the patient as done.`)) {
      this.activeDoctorPatient.status = "Completed";
      const notesEl = document.getElementById('doc-notes-textarea');
      if (notesEl) this.activeDoctorPatient.doctorNotes = notesEl.value;
      this.saveStoredQueue(DEMO_DATA.patientQueue);
      this.renderDoctorQueue();
      this.selectDoctorPatient(this.activeDoctorPatient.id);
      this.showNotification(`✅ Consultation for ${this.activeDoctorPatient.name} marked as Completed.`);
    }
  },

  openFullConversationModal() {
    const p = this.activeDoctorPatient;
    const body = document.getElementById('transcript-dialog-body');
    if (!body) return;
    if (p && p.conversationLog && p.conversationLog.length > 0) {
      body.innerHTML = p.conversationLog.map(msg => {
        const isBot = msg.sender === 'MediSarthi';
        return `<div style="margin-bottom:12px;text-align:${isBot?'left':'right'};">
          <span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px;">
            ${isBot ? '🤖' : '👤'} ${msg.sender} · ${msg.time}
          </span>
          <div style="display:inline-block;padding:10px 14px;border-radius:12px;background:${isBot?'#f8fafc':'#dcfce7'};border:1px solid var(--border-color);max-width:80%;font-size:0.95rem;text-align:left;">
            ${msg.text}
          </div>
        </div>`;
      }).join('');
    } else {
      body.innerHTML = '<p style="color:var(--text-muted);text-align:center;">No conversation recorded yet.</p>';
    }
    document.getElementById('conversation-modal').classList.add('active');
  },

  closeConversationModal() {
    document.getElementById('conversation-modal').classList.remove('active');
  },

  openAyushModal() {
    const p = this.activeDoctorPatient;
    const body = document.getElementById('ayush-modal-body');
    if (!body) return;
    const ansObj = p?.ayush?.answers || p?.ayushAnswers || {};
    
    const qList = this.ayushQuestions;
    const answeredRows = [];
    
    qList.forEach(q => {
      const val = ansObj[q.id];
      if (val) {
        answeredRows.push([q.title || q.text, val]);
      }
    });

    if (answeredRows.length === 0 && p?.ayush) {
      if (p.ayush.sleep) answeredRows.push(['Sleep Routine', p.ayush.sleep]);
      if (p.ayush.schedule) answeredRows.push(['Daily Schedule', p.ayush.schedule]);
      if (p.ayush.food) answeredRows.push(['Food Pattern', p.ayush.food]);
      if (p.ayush.digestion) answeredRows.push(['Digestion', p.ayush.digestion]);
      if (p.ayush.activity) answeredRows.push(['Physical Activity', p.ayush.activity]);
      if (p.ayush.yoga) answeredRows.push(['Wellness Practices', p.ayush.yoga]);
    }

    if (answeredRows.length > 0) {
      body.innerHTML = `<div class="summary-table-card" style="text-align:left;">` +
        answeredRows.map(([label, val]) => `
          <div class="summary-row">
            <div class="summary-label">${label}</div>
            <div class="summary-val">${val}</div>
          </div>`).join('') +
        `</div>`;
    } else {
      body.innerHTML = '<p style="color:var(--text-muted);padding:14px;text-align:center;">No AYUSH wellness responses provided (skipped or not completed).</p>';
    }
    document.getElementById('ayush-modal').classList.add('active');
  },

  printPrescription() {
    if (!this.activeDoctorPatient) {
      this.showNotification('⚠️ No patient selected for prescription PDF.');
      return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
      this.showNotification('⚠️ PDF generator library loading failed.');
      return;
    }

    // Auto-add medicine currently in input fields if doctor hasn't clicked 'Add Medicine' yet
    const pendingNameEl = document.getElementById('rx-name');
    if (pendingNameEl && pendingNameEl.value.trim()) {
      this.addPrescriptionItem();
    }

    // Sync current doctor notes from textarea to activeDoctorPatient state
    const notesEl = document.getElementById('doc-notes-textarea');
    if (notesEl && this.activeDoctorPatient) {
      this.activeDoctorPatient.doctorNotes = notesEl.value;
    }

    const p = this.activeDoctorPatient;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 40;

    // --- HEADER / BRANDING ---
    doc.setFillColor(15, 23, 42); // MediSarthi Dark Navy (#0f172a)
    doc.rect(0, 0, pageWidth, 70, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('MediSarthi', 40, 38);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Official Clinical Prescription · Government Hospital Network', 40, 53);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('City General Hospital, Mumbai', pageWidth - 40, 35, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Department of General Medicine', pageWidth - 40, 50, { align: 'right' });

    y = 90;

    // --- DOCTOR & CONSULTATION DETAILS ---
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Dr. Meera Sharma', 40, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text('MD General Medicine · Reg No: MMC-2018-84920', 40, y + 14);

    const todayDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Date: ${todayDate}`, pageWidth - 40, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Time: ${p.time || '09:15 AM'}`, pageWidth - 40, y + 14, { align: 'right' });

    y += 36;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(40, y, pageWidth - 40, y);

    y += 16;

    // --- PATIENT DETAILS BOX ---
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(40, y, pageWidth - 80, 54, 6, 6, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Patient Name: ${p.name}`, 54, y + 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Age / Gender: ${p.age}y / ${p.gender}`, 54, y + 40);
    doc.text(`Patient ID: ${p.id}`, 260, y + 22);
    doc.text(`Chief Complaint: ${p.chiefComplaint || 'Consultation'}`, 260, y + 40);

    y += 70;

    // --- DIAGNOSIS / CLINICAL NOTES ---
    const doctorNotes = document.getElementById('doc-notes-textarea')?.value.trim() || p.doctorNotes || '';
    if (doctorNotes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('Clinical Diagnosis & Observations', 40, y);
      y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const splitNotes = doc.splitTextToSize(doctorNotes, pageWidth - 80);
      doc.text(splitNotes, 40, y);
      y += (splitNotes.length * 13) + 14;
    }

    // --- PRESCRIPTIONS TABLE ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Rx — Prescribed Medicines', 40, y);
    y += 14;

    const rxs = p.prescriptions || [];
    
    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(40, y, pageWidth - 80, 22, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(40, y + 22, pageWidth - 40, y + 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('#', 48, y + 15);
    doc.text('Medicine Name', 70, y + 15);
    doc.text('Dosage', 230, y + 15);
    doc.text('Frequency', 310, y + 15);
    doc.text('Duration', 390, y + 15);
    doc.text('Instructions', 460, y + 15);

    y += 22;

    if (rxs.length === 0) {
      y += 18;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(148, 163, 184);
      doc.text('No prescription medications entered.', 48, y);
      y += 16;
    } else {
      rxs.forEach((rx, index) => {
        const nameText = rx.name || '—';
        const dosageText = rx.dosage || '—';
        const freqText = rx.frequency || '—';
        const durText = rx.duration || '—';
        const instText = rx.instructions || '—';

        const nameLines = doc.splitTextToSize(nameText, 150);
        const dosageLines = doc.splitTextToSize(dosageText, 75);
        const freqLines = doc.splitTextToSize(freqText, 75);
        const durLines = doc.splitTextToSize(durText, 65);
        const instLines = doc.splitTextToSize(instText, 90);

        const maxLines = Math.max(nameLines.length, dosageLines.length, freqLines.length, durLines.length, instLines.length, 1);
        const rowHeight = (maxLines * 12) + 14;

        if (y + rowHeight > 780) {
          doc.addPage();
          y = 40;
        }

        y += 14;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${index + 1}`, 48, y);
        doc.text(nameLines, 70, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(dosageLines, 230, y);
        doc.text(freqLines, 310, y);
        doc.text(durLines, 390, y);
        doc.text(instLines, 460, y);

        y += (maxLines - 1) * 12 + 8;
        doc.setDrawColor(241, 245, 249);
        doc.line(40, y, pageWidth - 40, y);
      });
    }

    y += 30;

    // --- ALLERGIES / CAUTION WARNING ---
    const allergies = p.summary?.allergies || this.state.allergies || 'Penicillin';
    if (allergies && allergies !== 'None' && allergies !== 'Not provided') {
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(252, 165, 165);
      doc.roundedRect(40, y, pageWidth - 80, 28, 4, 4, 'FD');

      doc.setTextColor(185, 28, 28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(`Known Allergies: ${allergies}`, 52, y + 18);

      y += 42;
    }

    // --- FOOTER & SIGNATURE ---
    const footerY = Math.max(y + 40, 720);

    doc.setDrawColor(148, 163, 184);
    doc.line(pageWidth - 200, footerY - 25, pageWidth - 40, footerY - 25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('Dr. Meera Sharma', pageWidth - 120, footerY - 10, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Authorized Medical Officer', pageWidth - 120, footerY + 2, { align: 'center' });

    doc.setDrawColor(226, 232, 240);
    doc.line(40, footerY + 20, pageWidth - 40, footerY + 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Generated via MediSarthi Kiosk & Doctor Consultation Desk · Digital Verification Code: MS-RX-' + Math.floor(100000 + Math.random() * 900000), 40, footerY + 34);

    // --- GENERATE PDF FILE DOWNLOAD AND BLOB PREVIEW ---
    const fileName = `MediSarthi_Prescription_${p.id}_${p.name.replace(/\s+/g, '_')}.pdf`;
    
    // 1. Download .pdf file directly
    doc.save(fileName);

    // 2. Open PDF blob in a new browser tab
    try {
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');
    } catch (e) {
      console.log('Blob URL popup blocked or unsupported:', e);
    }

    this.showNotification(`📄 Prescription PDF downloaded: ${fileName}`);
  },

  closeAyushModal() {
    document.getElementById('ayush-modal').classList.remove('active');
  },

  // ── UTILITY ────────────────────────────────────────────────────────────────
  logMsg(sender, text, isVoice = false) {
    this.state.conversationLog.push({
      sender, text,
      time: this.nowTime(),
      voice: isVoice
    });
  },

  nowTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  showNotification(msg) {
    let notif = document.getElementById('app-notification');
    if (!notif) {
      notif = document.createElement('div');
      notif.id = 'app-notification';
      notif.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#0f172a;color:white;padding:14px 22px;border-radius:12px;font-weight:700;font-size:0.95rem;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.3);transition:all 0.3s;';
      document.body.appendChild(notif);
    }
    notif.innerText = msg;
    notif.style.opacity = '1';
    notif.style.transform = 'translateY(0)';
    clearTimeout(this._notifTimer);
    this._notifTimer = setTimeout(() => {
      notif.style.opacity = '0';
      notif.style.transform = 'translateY(10px)';
    }, 3000);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());

App.nextStep = function() {}; // Basic stub
App.prevStep = function() {}; // Basic stub

// --- KIOSK RESET LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
  const completeBtn = document.getElementById('complete-session-btn');
  if (completeBtn) {
    completeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof App !== 'undefined' && typeof App.clearSession === 'function') {
        App.clearSession();
      }
      try {
        history.replaceState({ screen: 1, aqIndex: 0, ayushIndex: 0 }, '', '#step-1');
      } catch (err) {}
      // Hard reset the browser to clear all patient data for the next user
      window.location.reload(); 
    });
  }
});

// --- ROBUST TRANSLATION & SPEECH HELPER ---
function getActiveLanguage() {
  return localStorage.getItem('medisarthi_lang') || 'en';
}

function getLocalizedText(key, fallback = '') {
  const lang = getActiveLanguage();
  if (
      typeof TRANSLATIONS !== 'undefined' &&
      TRANSLATIONS[lang] &&
      TRANSLATIONS[lang][key]
  ) {
      return TRANSLATIONS[lang][key];
  }
  if (
      typeof TRANSLATIONS !== 'undefined' &&
      TRANSLATIONS.en &&
      TRANSLATIONS.en[key]
  ) {
      return TRANSLATIONS.en[key];
  }
  return fallback;
}

function speakText(text) {
  if (!text || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  
  const lang = getActiveLanguage();
  
  const languageMap = {
      en: 'en-IN',
      hi: 'hi-IN',
      mr: 'mr-IN',
      bn: 'bn-IN',
      te: 'te-IN'
  };
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = languageMap[lang] || 'en-IN';
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;
  
  const voices = window.speechSynthesis.getVoices();
  let matchingVoice = voices.find(voice =>
      voice.lang.toLowerCase() === utterance.lang.toLowerCase()
  ) || voices.find(voice =>
      voice.lang.toLowerCase().startsWith(lang) || (lang === 'mr' && voice.lang.toLowerCase().startsWith('mar'))
  );
  
  // Devanagari Fallback: If Marathi voice is missing, use Hindi voice to read Marathi text
  // This ensures understandable speech instead of English gibberish, since both use Devanagari.
  if (!matchingVoice && lang === 'mr') {
      matchingVoice = voices.find(voice => voice.lang.toLowerCase().startsWith('hi'));
      if (matchingVoice) {
          utterance.lang = matchingVoice.lang;
      }
  }
  
  if (matchingVoice) {
      utterance.voice = matchingVoice;
  }
  
  window.speechSynthesis.speak(utterance);
}

// --- CROSS-TAB DOCTOR/PATIENT REAL-TIME SYNC ---
window.addEventListener('storage', (e) => {
  if (e.key === 'medisarthi_patient_queue' && e.newValue) {
    try {
      DEMO_DATA.patientQueue = JSON.parse(e.newValue);
      if (typeof App !== 'undefined' && document.getElementById('doc-queue-list')) {
        App.renderDoctorQueue();
      }
    } catch (err) {
      console.error('Storage sync error:', err);
    }
  }
});

window.addEventListener('focus', () => {
  if (typeof App !== 'undefined' && document.getElementById('doc-queue-list')) {
    const queue = App.getStoredQueue();
    DEMO_DATA.patientQueue = queue;
    App.renderDoctorQueue();
  }
});

// --- GLOBAL KEYBOARD ACCESSIBILITY & MODAL NAVIGATION LAYER ---
window.addEventListener('keydown', (e) => {
  // 1. ESCAPE KEY: Close active modal/overlay safely
  if (e.key === 'Escape') {
    const helpModal = document.getElementById('help-modal');
    if (helpModal && helpModal.style.display !== 'none' && helpModal.style.display !== '') {
      helpModal.style.display = 'none';
      return;
    }
    const scanOverlay = document.getElementById('scan-overlay');
    if (scanOverlay && scanOverlay.style.display !== 'none' && scanOverlay.style.display !== '') {
      scanOverlay.style.display = 'none';
      return;
    }
    const reportModal = document.getElementById('report-preview-modal');
    if (reportModal && reportModal.style.display !== 'none' && reportModal.style.display !== '') {
      if (typeof App !== 'undefined' && App.closeReportPreview) App.closeReportPreview();
      else reportModal.style.display = 'none';
      return;
    }
    const convModal = document.getElementById('full-conversation-modal');
    if (convModal && convModal.style.display !== 'none' && convModal.style.display !== '') {
      if (typeof App !== 'undefined' && App.closeFullConversationModal) App.closeFullConversationModal();
      else convModal.style.display = 'none';
      return;
    }
    const ayushModal = document.getElementById('ayush-modal');
    if (ayushModal && ayushModal.style.display !== 'none' && ayushModal.style.display !== '') {
      if (typeof App !== 'undefined' && App.closeAyushModal) App.closeAyushModal();
      else ayushModal.style.display = 'none';
      return;
    }
  }

  // 2. ENTER / SPACE KEY: Activate focused interactive non-button cards/elements
  const activeEl = document.activeElement;
  if (!activeEl) return;

  const isTextarea = activeEl.tagName === 'TEXTAREA';
  const isInput = activeEl.tagName === 'INPUT';
  const isButton = activeEl.tagName === 'BUTTON';

  // Do NOT interfere with native button clicks or textarea newline creation
  if (isTextarea) return;

  if (e.key === 'Enter' || e.key === ' ') {
    const isCustomInteractive = activeEl.classList.contains('ms-option') ||
      activeEl.classList.contains('ms-symptom-row') ||
      activeEl.classList.contains('ms-chip') ||
      activeEl.classList.contains('gender-btn') ||
      activeEl.classList.contains('kiosk-chip') ||
      activeEl.classList.contains('severity-card') ||
      activeEl.getAttribute('tabindex') === '0' ||
      activeEl.getAttribute('role') === 'button';

    if (isCustomInteractive && !isButton && !isInput) {
      e.preventDefault();
      activeEl.click();
      return;
    }
  }

  // 3. ENTER KEY ON FORM INPUTS: Trigger primary continue action
  if (e.key === 'Enter' && isInput) {
    const inputId = activeEl.id;
    if (inputId === 'aadhaar-input') {
      e.preventDefault();
      if (typeof App !== 'undefined' && App.validateAadhaarAndContinue) App.validateAadhaarAndContinue();
    } else if (inputId === 'search-patient-input') {
      e.preventDefault();
      if (typeof App !== 'undefined' && App.searchPatientRecord) App.searchPatientRecord();
    } else if (inputId === 'input-full-name' || inputId === 'input-age' || inputId === 'input-mobile') {
      e.preventDefault();
      if (typeof App !== 'undefined' && App.confirmProfileAndProceed) App.confirmProfileAndProceed();
    } else if (inputId === 'input-allergy') {
      e.preventDefault();
      if (typeof App !== 'undefined' && App.submitAllergies) App.submitAllergies();
    }
  }
});

// Run i18n & keyboard attribute setup on load
document.addEventListener('DOMContentLoaded', () => {
  if (typeof App !== 'undefined' && App.updateLanguageUI) {
    App.updateLanguageUI();
  }
});

