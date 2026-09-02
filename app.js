/**
 * MediSarthi — Core Application Controller & State Engine
 * Complete version with full adaptive question flows, AYUSH multi-question survey,
 * and connected follow-up questions for all symptom pathways.
 */

// --- ROBUST TRANSLATION & SPEECH HELPER ---
function getLocalizedText(key, fallbackText) {
  const lang = localStorage.getItem('medisarthi_lang') || 'en';
  if (window.translations && window.translations[lang] && window.translations[lang][key]) {
    return window.translations[lang][key];
  }
  return fallbackText;
}

function speakText(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); 
  
  const lang = localStorage.getItem('medisarthi_lang') || 'en';
  const langMap = {
    'hi': 'hi-IN',
    'mr': 'mr-IN',
    'ta': 'ta-IN',
    'bn': 'bn-IN',
    'te': 'te-IN',
    'en': 'en-IN'
  };
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langMap[lang] || 'en-IN';
  window.speechSynthesis.speak(utterance);
}

const App = {
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
    aadhaar: "987654321098",
    fullName: "Ramesh Patil",
    age: "45",
    gender: "Male",
    mobile: "9820154321",
    patientId: "MS1001",
    chiefComplaint: "Stomach Pain",
    symptomIntent: "stomach_pain",
    bodyLocation: "Around Navel",
    duration: "1 – 3 days",
    severity: "Moderate",
    reportsUploaded: [
      { title: "Blood Test (CBC)", date: "20 May 2026", type: "pdf" }
    ],
    conversationLog: [
      { sender: "MediSarthi", text: "Welcome to MediSarthi! What brings you here today?", time: "09:15 AM" }
    ],
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
        id: 'sp_location', text: 'Where does it hurt?',
        subtitle: 'Tap on the body diagram or select below.',
        type: 'body_map',
        options: ['Upper Abdomen','Around Navel','Lower Abdomen','Left Side','Right Side','All Over']
      },
      {
        id: 'sp_duration', text: 'How long have you had this pain?',
        subtitle: 'Select how many days you have had this symptom.',
        type: 'options',
        options: ['Less than 1 day','1 – 3 days','4 – 7 days','More than 7 days']
      },
      {
        id: 'sp_severity', text: 'How severe is the pain?',
        subtitle: 'Choose the level of discomfort you feel right now.',
        type: 'severity',
        options: ['Mild','Moderate','Severe']
      },
      {
        id: 'sp_onset', text: 'Did the pain come on suddenly or gradually?',
        subtitle: 'Choose how the pain started.',
        type: 'options',
        options: ['Sudden (came out of nowhere)','Gradually (got worse over time)','Comes and goes']
      },
      {
        id: 'sp_eating', text: 'Does eating make the pain worse?',
        subtitle: 'Think about whether food or drink affects the pain.',
        type: 'yesno',
        options: ['Yes – worse after eating','Yes – worse before eating','No difference','Not sure']
      },
      {
        id: 'sp_nausea', text: 'Do you have nausea or vomiting?',
        subtitle: 'Select what you have experienced.',
        type: 'options',
        options: ['Nausea only (no vomiting)','Vomiting occurred','Both nausea and vomiting','No – neither']
      },
      {
        id: 'sp_fever_associated', text: 'Do you also have fever?',
        subtitle: '',
        type: 'yesno',
        options: ['Yes','No','Slight warmth but not sure']
      },
      {
        id: 'sp_bowel', text: 'Any change in your bowel movements (motions)?',
        subtitle: 'This helps the doctor understand what is happening.',
        type: 'options',
        options: ['Loose stools / Diarrhea','Constipation (no motion)','Normal','Blood in stool','Not sure']
      },
      {
        id: 'sp_past_history', text: 'Have you had this pain before?',
        subtitle: 'Tell us if this is a recurring problem.',
        type: 'options',
        options: ['First time ever','Yes – happened before, goes away on its own','Yes – ongoing problem','Yes – diagnosed condition (e.g. Gastritis, IBS)']
      }
    ],

    cough_cold: [
      {
        id: 'cc_duration', text: 'How long have you been coughing?',
        subtitle: 'Select the number of days.',
        type: 'options',
        options: ['Less than 2 days','3 – 5 days','5 – 7 days','More than 7 days']
      },
      {
        id: 'cc_type', text: 'What kind of cough do you have?',
        subtitle: 'Select the option that best describes your cough.',
        type: 'options',
        options: ['Dry cough (no mucus)','Wet cough with white/clear mucus','Yellow or green mucus (phlegm)','Blood in mucus (streaks)']
      },
      {
        id: 'cc_severity', text: 'How much is the cough disturbing you?',
        subtitle: 'Rate the impact on your daily routine.',
        type: 'severity',
        options: ['Mild','Moderate','Severe']
      },
      {
        id: 'cc_fever', text: 'Do you have fever along with the cough?',
        subtitle: '',
        type: 'yesno',
        options: ['Yes – high fever','Yes – mild fever','No fever']
      },
      {
        id: 'cc_breathing', text: 'Do you have any difficulty breathing?',
        subtitle: 'This is important for the doctor to know.',
        type: 'options',
        options: ['Shortness of breath at rest','Shortness of breath on walking','Mild breathlessness','No – breathing is fine']
      },
      {
        id: 'cc_throat', text: 'Do you have a sore throat or runny nose?',
        subtitle: '',
        type: 'options',
        options: ['Sore throat only','Runny nose only','Both sore throat and runny nose','Neither']
      },
      {
        id: 'cc_cold_contact', text: 'Have you been around someone who was sick recently?',
        subtitle: 'For example, family member or colleague with similar symptoms.',
        type: 'yesno',
        options: ['Yes','No','Not sure']
      },
      {
        id: 'cc_chest_pain', text: 'Do you feel any chest pain or tightness with the cough?',
        subtitle: '',
        type: 'yesno',
        options: ['Yes – chest pain','Yes – just tightness','No']
      }
    ],

    fever: [
      {
        id: 'fv_duration', text: 'How long have you had the fever?',
        subtitle: 'Select how many days you have had the fever.',
        type: 'options',
        options: ['Less than 1 day','1 – 3 days','4 – 7 days','More than 7 days']
      },
      {
        id: 'fv_severity', text: 'How high is the fever?',
        subtitle: 'Approximate temperature if known.',
        type: 'options',
        options: ['Mild (99 – 100°F / 37.2 – 37.8°C)','Moderate (100 – 102°F / 37.8 – 38.9°C)','High (above 102°F / 38.9°C)','I have not measured it']
      },
      {
        id: 'fv_chills', text: 'Do you have chills or shivering?',
        subtitle: 'Some infections cause the body to feel very cold despite high temperature.',
        type: 'yesno',
        options: ['Yes – severe chills','Yes – mild chills','No chills']
      },
      {
        id: 'fv_onset', text: 'How did the fever start?',
        subtitle: '',
        type: 'options',
        options: ['Sudden – very quickly','Gradually over a day','Comes and goes (intermittent)']
      },
      {
        id: 'fv_cough', text: 'Do you also have a cough?',
        subtitle: '',
        type: 'yesno',
        options: ['Yes – dry cough','Yes – cough with phlegm','No cough']
      },
      {
        id: 'fv_body_ache', text: 'Do you have body ache or joint pain with the fever?',
        subtitle: '',
        type: 'yesno',
        options: ['Yes – severe body ache','Yes – mild ache','No']
      },
      {
        id: 'fv_rash', text: 'Have you noticed any skin rash or red spots?',
        subtitle: 'This can help identify certain conditions.',
        type: 'yesno',
        options: ['Yes – rash appeared','No rash']
      },
      {
        id: 'fv_vomiting', text: 'Do you have vomiting or loose stools with the fever?',
        subtitle: '',
        type: 'options',
        options: ['Vomiting only','Loose stools only','Both','Neither']
      },
      {
        id: 'fv_travel', text: 'Have you recently travelled outside your city?',
        subtitle: 'Travel history is sometimes relevant for infections.',
        type: 'yesno',
        options: ['Yes – in last 2 weeks','No']
      }
    ],

    headache: [
      {
        id: 'hd_duration', text: 'How long have you had this headache?',
        subtitle: '',
        type: 'options',
        options: ['Started today (less than 24 hrs)','1 – 3 days','3 – 7 days','Recurring for weeks/months']
      },
      {
        id: 'hd_location', text: 'Where is the headache located?',
        subtitle: 'Select the area that hurts most.',
        type: 'options',
        options: ['Forehead / Front','Temples (sides of head)','Back of head','Top of head','One side only (Left or Right)','Entire head']
      },
      {
        id: 'hd_severity', text: 'How severe is the headache?',
        subtitle: '',
        type: 'severity',
        options: ['Mild','Moderate','Severe']
      },
      {
        id: 'hd_onset', text: 'How did the headache start?',
        subtitle: '',
        type: 'options',
        options: ['Sudden – very intense immediately','Gradually got worse','Throbbing / pulsating','Constant pressure / dull ache']
      },
      {
        id: 'hd_light', text: 'Does light or noise bother you when you have the headache?',
        subtitle: 'This can help the doctor understand the type of headache.',
        type: 'options',
        options: ['Yes – both light and noise','Yes – light only','Yes – noise only','No – neither bothers me']
      },
      {
        id: 'hd_nausea', text: 'Do you have nausea or vomiting along with the headache?',
        subtitle: '',
        type: 'yesno',
        options: ['Yes – nausea','Yes – vomiting too','No']
      },
      {
        id: 'hd_vision', text: 'Any changes in vision before or during the headache?',
        subtitle: 'For example: blurring, flashes of light, seeing patterns.',
        type: 'options',
        options: ['Yes – blurred vision','Yes – flashes or patterns (aura)','Yes – double vision','No vision changes']
      },
      {
        id: 'hd_trigger', text: 'What seems to trigger the headache?',
        subtitle: 'Select all that apply (most significant).',
        type: 'options',
        options: ['Stress or tension','Lack of sleep','Dehydration (not enough water)','Screen time (phone/computer)','No clear trigger']
      },
      {
        id: 'hd_previous', text: 'Have you had similar headaches before?',
        subtitle: '',
        type: 'options',
        options: ['Yes – diagnosed as Migraine','Yes – recurring but not diagnosed','First time this severe','Occasional mild headaches']
      }
    ],

    body_pain: [
      {
        id: 'bp_location', text: 'Where is the pain most in your body?',
        subtitle: 'Select the area most affected.',
        type: 'options',
        options: ['Whole body (generalised)','Back only','Legs / Knees','Shoulders / Arms','Joints (multiple)','Muscles only']
      },
      {
        id: 'bp_duration', text: 'How long have you had this pain?',
        subtitle: '',
        type: 'options',
        options: ['Today only','1 – 3 days','4 – 7 days','More than 7 days']
      },
      {
        id: 'bp_severity', text: 'How severe is the pain?',
        subtitle: '',
        type: 'severity',
        options: ['Mild','Moderate','Severe']
      },
      {
        id: 'bp_fever', text: 'Is the body pain accompanied by fever?',
        subtitle: '',
        type: 'yesno',
        options: ['Yes – high fever','Yes – mild fever','No fever']
      },
      {
        id: 'bp_swelling', text: 'Do you notice any swelling around the painful area?',
        subtitle: '',
        type: 'yesno',
        options: ['Yes – visible swelling','Yes – slight swelling','No swelling']
      },
      {
        id: 'bp_activity', text: 'Does movement make the pain worse?',
        subtitle: '',
        type: 'options',
        options: ['Yes – worse on movement','No – constant even at rest','Worse after activity','Better after light movement']
      }
    ],

    something_else: [
      {
        id: 'se_problem', text: 'Can you describe what you are feeling?',
        subtitle: 'Type in the box below or use the microphone to speak.',
        type: 'text'
      },
      {
        id: 'se_duration', text: 'How long have you had this problem?',
        subtitle: '',
        type: 'options',
        options: ['Today / Just started','1 – 3 days','4 – 7 days','More than 1 week']
      },
      {
        id: 'se_severity', text: 'How much is it bothering you?',
        subtitle: '',
        type: 'severity',
        options: ['Mild','Moderate','Severe']
      },
      {
        id: 'se_other_symptoms', text: 'Do you have any other symptoms along with this?',
        subtitle: 'Select what else you are experiencing.',
        type: 'options',
        options: ['Fever','Nausea / Vomiting','Weakness / Fatigue','Difficulty breathing','No other symptoms']
      },
      {
        id: 'se_history', text: 'Have you had this problem before?',
        subtitle: '',
        type: 'options',
        options: ['First time','Happened before – resolved on its own','Ongoing recurring problem','Diagnosed condition']
      }
    ]
  },

  // ── AYUSH MULTI-QUESTION FLOW ────────────────────────────────────────────────
  ayushQuestions: [
    {
      id: 'ay_sleep', text: 'Sleep Routine',
      subtitle: 'How many hours of sleep do you get on a typical night?',
      type: 'options',
      icon: '<i class="fa-solid fa-moon" style="color:var(--primary);"></i>',
      options: ['7-8 hours (regular)','5-6 hours','Irregular / disturbed','Less than 5 hours']
    },
    {
      id: 'ay_schedule', text: 'Daily Schedule & Meals',
      subtitle: 'Are your meals and daily routine regular?',
      type: 'options',
      icon: '<i class="fa-solid fa-clock" style="color:var(--primary);"></i>',
      options: ['Very regular','Mostly regular','Irregular (skip meals)','Highly unpredictable']
    },
    {
      id: 'ay_food', text: 'Fresh Home-cooked Meals',
      subtitle: 'How often do you eat freshly prepared home food?',
      type: 'options',
      icon: '<i class="fa-solid fa-bowl-food" style="color:var(--primary);"></i>',
      options: ['All meals','Most meals','Sometimes','Rarely (mostly outside food)']
    },
    {
      id: 'ay_digestion', text: 'Digestion & Appetite',
      subtitle: 'How is your digestion and feeling of hunger?',
      type: 'options',
      icon: '<i class="fa-solid fa-fire-burner" style="color:var(--primary);"></i>',
      options: ['Good appetite, clear digestion','Variable appetite','Frequent bloating/acidity','Poor appetite/constipation']
    },
    {
      id: 'ay_activity', text: 'Physical Activity',
      subtitle: 'What is your daily walking or physical activity habit?',
      type: 'options',
      icon: '<i class="fa-solid fa-person-walking" style="color:var(--primary);"></i>',
      options: ['Active (30+ mins walking/exercise)','Moderate (household chores/light walking)','Sedentary (mostly sitting)']
    },
    {
      id: 'ay_yoga', text: 'Wellness Practices',
      subtitle: 'Do you engage in Yoga, Pranayama, or meditation?',
      type: 'options',
      icon: '<i class="fa-solid fa-om" style="color:var(--primary);"></i>',
      options: ['Daily','Occasionally','Rarely','No, but interested','No']
    }
  ],

  ayushIndex: 0,
  ayushAnswers: {},

  // ── INITIALIZATION ────────────────────────────────────────────────────────
  init() {
    console.log("Initializing MediSarthi App Engine...");
    const savedLang = localStorage.getItem('selectedLanguage') || 'en';
    this.currentLang = savedLang;
    window.translate = (text) => this.t(text);
    window.speak = (text) => this.speak(text);
    this.updateLanguageUI();
    this.renderDoctorQueue();
    this.selectDoctorPatient("MS1001");
  },

  // ── LANGUAGE ENGINE ───────────────────────────────────────────────────────
  setLanguage(langCode) {
    if (!TRANSLATIONS[langCode]) langCode = 'en';
    this.currentLang = langCode;
    localStorage.setItem('selectedLanguage', langCode);
    localStorage.setItem('medisarthi_lang', langCode);
    document.querySelectorAll('.language-bar .lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(`'${langCode}'`));
    });
    document.querySelectorAll('.lang-card-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('onclick')?.includes(`'${langCode}'`));
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
    this.showScreen(3);
  },

  updateLanguageUI() {
    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS['en'];
    document.querySelectorAll('[data-i18n]').forEach(elem => {
      const key = elem.getAttribute('data-i18n');
      if (dict[key]) elem.innerText = dict[key];
    });
  },

  openMoreLanguages() {
    alert("Supported Indian Languages:\nEnglish | हिंदी (Hindi) | मराठी (Marathi) | தமிழ் (Tamil) | বাংলা (Bengali) | తెలుగు (Telugu) | ಕನ್ನಡ (Kannada) | ગુજરાતી (Gujarati) | ਪੰਜਾਬੀ (Punjabi) | ଓଡ଼ିଆ (Odia)");
  },

  // ── SCREEN ROUTING ────────────────────────────────────────────────────────
  showScreen(screenNum) {
    this.currentScreen = screenNum;
    const map = {
      1: 'step-welcome',
      2: 'step-language',
      3: 'step-id',
      4: 'step-4',
      5: 'step-5',
      6: 'step-complaint',
      12: 'step-summary',
      13: 'step-ayurveda',
      14: 'step-documents',
      15: 'step-15',
      16: 'step-16',
      17: 'step-17',
      20: 'step-adaptive'
    };
    const stepId = map[screenNum] || `step-${screenNum}`;

    document.querySelectorAll('.step-view').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById(stepId);
    if (target) {
      target.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    document.querySelectorAll('.demo-pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(`showScreen(${screenNum})`));
    });
    if (screenNum === 6) {
      const text = this.t('what_brings_you');
      setTimeout(() => { speakText(text); }, 400);
    }
  },

  switchMode(targetMode) {
    this.mode = targetMode;
    const kiosk = document.getElementById('patient-kiosk-wrapper');
    const doctor = document.getElementById('step-doctor-portal');
    if (targetMode === 'doctor') {
      kiosk.classList.add('hidden');
      doctor.classList.remove('hidden');
      // Show login, hide dashboard until actually logged in
      document.getElementById('doctor-login-card').classList.remove('hidden');
      document.getElementById('doctor-dashboard-main').classList.add('hidden');
    } else {
      kiosk.classList.remove('hidden');
      doctor.classList.add('hidden');
      this.showScreen(1);
    }
  },


  toggleHelpModal() {
    document.getElementById('help-modal').classList.toggle('active');
  },

  // ── PATIENT KIOSK STEPS ───────────────────────────────────────────────────
  simulateScanAadhaar() {
    const overlay = document.getElementById('scan-overlay');
    overlay.style.display = 'flex';
    setTimeout(() => {
      overlay.style.display = 'none';
      document.getElementById('aadhaar-input').value = "987654321098";
      this.showNotification("✅ Aadhaar QR scanned successfully!");
      setTimeout(() => this.showScreen(4), 700);
    }, 2500);
  },

  selectPatientType(type) {
    this.patientType = type;
    const existingView = document.getElementById('existing-profile-view');
    const newForm = document.getElementById('new-profile-form');
    if (type === 'existing') {
      existingView.style.display = 'block';
      newForm.style.display = 'none';
      const p = DEMO_DATA.existingPatients[0];
      document.getElementById('retrieved-name').innerText = p.name;
      document.getElementById('retrieved-full-name').innerText = p.name;
      document.getElementById('retrieved-age-gender').innerText = `${p.age} / ${getLocalizedText(p.gender, p.gender)}`;
      document.getElementById('retrieved-id').innerText = p.id;
      document.getElementById('retrieved-last-visit').innerText = p.lastVisit;
      document.getElementById('retrieved-history').innerText = p.medicalHistory;
      document.getElementById('retrieved-allergies').innerText = p.allergies;
      this.state = { ...this.state, fullName: p.name, age: String(p.age), gender: p.gender, patientId: p.id };
    } else {
      existingView.style.display = 'none';
      newForm.style.display = 'block';
      this.state.patientId = "MS" + Math.floor(1000 + Math.random() * 9000);
    }
    this.showScreen(5);
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
    this.state.conversationLog = [
      { sender: "MediSarthi", text: "Welcome to MediSarthi! What brings you here today?", time: this.nowTime() }
    ];
    this.showScreen(6);
  },

  // ── VOICE & NLP ────────────────────────────────────────────────────────────
  triggerVoiceInput() {
    const waveBox = document.getElementById('voice-listening-wave');
    const transcriptText = document.getElementById('voice-transcript-text');
    waveBox.style.display = 'flex';
    VoiceController.startListening(
      (transcript, isFinal) => {
        transcriptText.innerText = `"${transcript}"`;
        if (isFinal) {
          document.getElementById('free-text-input').value = transcript;
          setTimeout(() => { waveBox.style.display = 'none'; App.processInputIntent(transcript); }, 1000);
        }
      },
      (isListening) => { if (!isListening) waveBox.style.display = 'none'; }
    );
  },

  processInputIntent(customText) {
    const inputVal = (customText || document.getElementById('free-text-input').value).trim();
    if (!inputVal) { this.showNotification("⚠️ Please type or speak your symptom."); return; }
    const result = IntentClassifier.classify(inputVal);
    this.state.chiefComplaint = result.label;
    this.state.symptomIntent = result.intent;
    this.logMsg("Patient", inputVal, true);
    this.logMsg("MediSarthi", `Understood — let me ask you a few questions about your ${result.label}.`);
    this.startFlow(result.intent);
  },

  selectSymptom(symptomKey) {
    const labelMap = { stomach_pain:"Stomach Pain", cough_cold:"Cough / Cold", fever:"Fever", headache:"Headache", body_pain:"Body Pain", something_else:"Something Else" };
    this.state.symptomIntent = symptomKey;
    this.state.chiefComplaint = labelMap[symptomKey] || "Other";
    this.logMsg("Patient", `Selected: ${this.state.chiefComplaint}`);
    this.logMsg("MediSarthi", `Understood — let me ask you a few questions about your ${this.state.chiefComplaint}.`);
    this.startFlow(symptomKey);
  },

  // ── ADAPTIVE QUESTION ENGINE ──────────────────────────────────────────────
  startFlow(intentKey) {
    this.aqFlow = this.flows[intentKey] || this.flows['something_else'];
    this.aqIndex = 0;
    this.aqAnswers = {};
    this.state.bodyLocation = "Not specified";
    this.showAdaptiveQuestion();
  },

  showAdaptiveQuestion() {
    if (this.aqIndex >= this.aqFlow.length) {
      // All questions answered — show summary
      this.updateSummaryCard();
      this.showScreen(12);
      return;
    }
    const q = this.aqFlow[this.aqIndex];
    const total = this.aqFlow.length;
    const current = this.aqIndex + 1;

    // Render into the dynamic adaptive question screen (step-20)
    const container = document.getElementById('aq-container');
    if (!container) return;

    let optionsHtml = '';
    if (q.type === 'body_map') {
      optionsHtml = this.renderBodyMapHTML(q);
    } else if (q.type === 'severity') {
      optionsHtml = `<div class="severity-ratings-grid" style="margin-bottom:24px;">
        <div class="severity-card" onclick="App.answerAQ('Mild')"><h3>${getLocalizedText('Mild', 'Mild')}</h3><p style="font-size:0.8rem;color:var(--text-muted)">${getLocalizedText('Little or no interference with daily activities', 'Little or no interference with daily activities')}</p></div>
        <div class="severity-card" onclick="App.answerAQ('Moderate')"><h3>${getLocalizedText('Moderate', 'Moderate')}</h3><p style="font-size:0.8rem;color:var(--text-muted)">${getLocalizedText('Some interference with daily activities', 'Some interference with daily activities')}</p></div>
        <div class="severity-card" onclick="App.answerAQ('Severe')"><h3>${getLocalizedText('Severe', 'Severe')}</h3><p style="font-size:0.8rem;color:var(--text-muted)">${getLocalizedText('Significant interference with daily activities', 'Significant interference with daily activities')}</p></div>
      </div>`;
    } else if (q.type === 'text') {
      optionsHtml = `<div style="margin-bottom:24px;">
        <textarea id="aq-free-text" class="kiosk-input" style="height:110px;font-size:1.05rem;text-align:left;resize:none;" placeholder="${getLocalizedText('type_your_problem', 'Type what you are feeling...')}"></textarea>
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
        q.options.map(opt =>
          `<button class="option-touch-btn" onclick="App.answerAQ('${opt.replace(/'/g,"\\'")}')">
            <span>${getLocalizedText(opt, opt)}</span> <i class="fa-solid fa-chevron-right"></i>
          </button>`
        ).join('') +
        `</div>`;
    }

    const qLabel = getLocalizedText('Question', 'Question');
    const ofLabel = getLocalizedText('of', 'of');
    const listenLabel = getLocalizedText('listen', 'Listen');
    const backLabel = getLocalizedText('back', 'Back');
    const helpLabel = getLocalizedText('need_help', 'Need Help?');
    
    const localizedQuestion = getLocalizedText(q.text, q.text);
    const localizedSubtitle = getLocalizedText(q.subtitle || '', q.subtitle || '');

    container.innerHTML = `
      <div class="kiosk-card">
        <!-- Progress Bar -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <span style="font-size:0.92rem;font-weight:700;color:var(--primary);background:var(--primary-light);padding:4px 14px;border-radius:999px;">
            ${qLabel} ${current} ${ofLabel} ${total}
          </span>
          <button class="btn-kiosk-secondary" style="min-height:36px;padding:4px 14px;font-size:0.88rem;width:auto;" onclick="speakText(document.getElementById('aq-q-text').innerText)">
            <i class="fa-solid fa-volume-high"></i> ${listenLabel}
          </button>
        </div>
        <div style="background:var(--border-color);border-radius:999px;height:6px;margin-bottom:24px;">
          <div style="background:var(--primary);width:${(current/total)*100}%;height:6px;border-radius:999px;transition:width 0.4s ease;"></div>
        </div>

        <h2 class="kiosk-title" id="aq-q-text" style="margin-bottom:10px;">${localizedQuestion}</h2>
        <p class="kiosk-subtitle" style="margin-bottom:24px;">${localizedSubtitle}</p>

        ${optionsHtml}

        <div class="step-nav-footer">
          <button class="btn-back" onclick="App.prevAQ()"><i class="fa-solid fa-arrow-left"></i> ${backLabel}</button>
          <button class="btn-help-link" onclick="App.toggleHelpModal()"><i class="fa-solid fa-circle-question"></i> ${helpLabel}</button>
        </div>
      </div>
    `;

    this.showScreen(20);
    // Speak question aloud
    setTimeout(() => speakText(localizedQuestion), 300);
  },

  renderBodyMapHTML(q) {
    const selectedLabel = getLocalizedText('selected_location', 'Selected Location');
    const continueLabel = getLocalizedText('continue', 'Continue');
    return `
      <div class="body-location-wrapper" style="margin-bottom:20px;">
        <div class="body-silhouette-card">
          <svg width="200" height="260" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
            <!-- Head -->
            <ellipse cx="100" cy="38" rx="22" ry="26" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2"/>
            <!-- Neck -->
            <rect x="91" y="60" width="18" height="14" fill="#cbd5e1"/>
            <!-- Torso -->
            <path d="M62 74 L138 74 L148 150 L138 240 L62 240 L52 150 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
            <!-- Arms -->
            <path d="M62 80 L40 160 L48 162 L68 88" fill="#d1d5db" stroke="#94a3b8" stroke-width="1.5"/>
            <path d="M138 80 L160 160 L152 162 L132 88" fill="#d1d5db" stroke="#94a3b8" stroke-width="1.5"/>
            <!-- Clickable Zones -->
            <rect id="svg-upper" x="76" y="82" width="48" height="30" rx="6" fill="#10b981" opacity="0.2" stroke="#059669" stroke-width="2" style="cursor:pointer;" onclick="App.selectBodyZoneAQ('Upper Abdomen')"/>
            <circle id="svg-navel" cx="100" cy="140" r="17" fill="#10b981" opacity="0.2" stroke="#059669" stroke-width="2" style="cursor:pointer;" onclick="App.selectBodyZoneAQ('Around Navel')"/>
            <rect id="svg-lower" x="76" y="165" width="48" height="28" rx="6" fill="#10b981" opacity="0.2" stroke="#059669" stroke-width="2" style="cursor:pointer;" onclick="App.selectBodyZoneAQ('Lower Abdomen')"/>
            <rect id="svg-left" x="52" y="120" width="22" height="55" rx="5" fill="#10b981" opacity="0.2" stroke="#059669" stroke-width="2" style="cursor:pointer;" onclick="App.selectBodyZoneAQ('Left Side')"/>
            <rect id="svg-right" x="126" y="120" width="22" height="55" rx="5" fill="#10b981" opacity="0.2" stroke="#059669" stroke-width="2" style="cursor:pointer;" onclick="App.selectBodyZoneAQ('Right Side')"/>
            <!-- Labels -->
            <text x="100" y="103" text-anchor="middle" font-size="9" fill="#059669" font-weight="bold">${getLocalizedText('Upper', 'Upper')}</text>
            <text x="100" y="143" text-anchor="middle" font-size="9" fill="#059669" font-weight="bold">${getLocalizedText('Navel', 'Navel')}</text>
            <text x="100" y="185" text-anchor="middle" font-size="9" fill="#059669" font-weight="bold">${getLocalizedText('Lower', 'Lower')}</text>
            <text x="40" y="155" text-anchor="middle" font-size="8" fill="#059669" font-weight="bold">${getLocalizedText('Left', 'Left')}</text>
            <text x="160" y="155" text-anchor="middle" font-size="8" fill="#059669" font-weight="bold">${getLocalizedText('Right', 'Right')}</text>
          </svg>
        </div>
        <div class="abdomen-zones-grid" style="flex:1;">
          ${q.options.map(zone =>
            `<button class="zone-select-btn" id="zone-btn-${zone.replace(/\s/g,'-')}" onclick="App.selectBodyZoneAQ('${zone.replace(/'/g,"\\'")}')">
              <span>${getLocalizedText(zone, zone)}</span> <i class="fa-solid fa-chevron-right"></i>
            </button>`
          ).join('')}
        </div>
      </div>
      <div id="zone-selected-display" style="background:var(--primary-light);padding:12px 16px;border-radius:var(--radius-md);font-weight:700;margin-bottom:20px;display:none;">
        ✅ ${selectedLabel}: <span id="zone-selected-text" style="color:var(--primary-hover);">—</span>
        <button class="btn-kiosk-primary" onclick="App.continueAfterBodyMap()" style="float:right;width:auto;min-height:38px;padding:4px 18px;font-size:0.9rem;">
          ${continueLabel} <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    `;
  },
  
  selectBodyZoneAQ(zoneName) {
    this.state.bodyLocation = zoneName;
    const translatedZone = getLocalizedText(zoneName, zoneName);
    // Highlight zone buttons
    document.querySelectorAll('.zone-select-btn').forEach(btn => {
      btn.classList.toggle('active', btn.innerText.trim().startsWith(translatedZone) || btn.innerText.trim().startsWith(zoneName));
    });
    const display = document.getElementById('zone-selected-display');
    const textEl = document.getElementById('zone-selected-text');
    if (display && textEl) {
      textEl.innerText = translatedZone;
      display.style.display = 'block';
    }
    // Highlight SVG zones
    ['svg-upper','svg-navel','svg-lower','svg-left','svg-right'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.setAttribute('opacity','0.2');
    });
    const svgMap = { 'Upper Abdomen':'svg-upper','Around Navel':'svg-navel','Lower Abdomen':'svg-lower','Left Side':'svg-left','Right Side':'svg-right' };
    const svgId = svgMap[zoneName];
    if (svgId) {
      const el = document.getElementById(svgId);
      if (el) el.setAttribute('opacity','0.75');
    }
    this.logMsg("Patient", `Pain location: ${zoneName}`);
  },

  continueAfterBodyMap() {
    if (this.state.bodyLocation === "Not specified") {
      this.showNotification("⚠️ Please select a location on the diagram.");
      return;
    }
    this.aqAnswers['sp_location'] = this.state.bodyLocation;
    this.aqIndex++;
    this.showAdaptiveQuestion();
  },

  answerAQ(answer) {
    const q = this.aqFlow[this.aqIndex];
    this.aqAnswers[q.id] = answer;
    this.logMsg("Patient", `${q.text} → ${answer}`);
    const translatedAnswer = getLocalizedText(answer, answer);
    // Highlight selected button briefly
    document.querySelectorAll('.option-touch-btn').forEach(btn => {
      if (btn.innerText.trim().startsWith(translatedAnswer.substring(0,15)) || btn.innerText.trim().startsWith(answer.substring(0,15))) btn.classList.add('selected');
    });
    document.querySelectorAll('.severity-card').forEach(c => {
      if (c.innerText.includes(translatedAnswer.split(' ')[0]) || c.innerText.includes(answer.split(' ')[0])) {
        c.classList.add('selected', answer.toLowerCase());
      }
    });
    setTimeout(() => {
      this.aqIndex++;
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
    if (this.aqIndex === 0) { this.showScreen(6); return; }
    this.aqIndex--;
    this.showAdaptiveQuestion();
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

  showAyushQuestion() {
    if (this.ayushIndex >= this.ayushQuestions.length) {
      // AYUSH complete
      this.state.ayushAnswers = { ...this.ayushAnswers };
      this.renderAyushSummary();
      this.showScreen(16); // Navigate to AYUSH Summary Screen (step-16)
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
    const helpLabel = getLocalizedText('need_help', 'Need Help?');
    
    const localizedQuestion = getLocalizedText(q.text, q.text);
    const localizedSubtitle = getLocalizedText(q.subtitle, q.subtitle);

    container.innerHTML = `
      <div class="kiosk-card">
        <div style="font-size:2.5rem;margin-bottom:8px;">${q.icon || '🌿'}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <span style="font-size:0.92rem;font-weight:700;color:#059669;background:#ecfdf5;padding:4px 14px;border-radius:999px;">
            ${ayushQLabel} ${current} ${ofLabel} ${total}
          </span>
          <button class="btn-kiosk-secondary" style="min-height:36px;padding:4px 14px;font-size:0.88rem;width:auto;" onclick="speakText(document.getElementById('ayush-q-text').innerText)">
            <i class="fa-solid fa-volume-high"></i> ${listenLabel}
          </button>
        </div>
        <div style="background:var(--border-color);border-radius:999px;height:6px;margin-bottom:24px;">
          <div style="background:#10b981;width:${(current/total)*100}%;height:6px;border-radius:999px;transition:width 0.4s ease;"></div>
        </div>

        <h2 class="kiosk-title" id="ayush-q-text" style="margin-bottom:8px;">${localizedQuestion}</h2>
        <p class="kiosk-subtitle" style="margin-bottom:20px;">${localizedSubtitle}</p>

        <div class="options-vertical-list">
          ${q.options.map(opt =>
            `<button class="option-touch-btn" onclick="App.answerAyush('${opt.replace(/'/g,"\\'")}')">
              <span>${getLocalizedText(opt, opt)}</span> <i class="fa-solid fa-chevron-right"></i>
            </button>`
          ).join('')}
        </div>

        <div class="step-nav-footer">
          <button class="btn-back" onclick="App.prevAyush()"><i class="fa-solid fa-arrow-left"></i> ${backLabel}</button>
          <button class="btn-help-link" onclick="App.toggleHelpModal()"><i class="fa-solid fa-circle-question"></i> ${helpLabel}</button>
        </div>
      </div>
    `;

    this.showScreen(17);
    setTimeout(() => speakText(localizedQuestion), 300);
  },

  answerAyush(answer) {
    const q = this.ayushQuestions[this.ayushIndex];
    this.ayushAnswers[q.id] = answer;
    this.logMsg("Patient", `AYUSH – ${q.text}: ${answer}`);
    setTimeout(() => {
      this.ayushIndex++;
      this.showAyushQuestion();
    }, 300);
  },

  prevAyush() {
    if (this.ayushIndex === 0) { this.showScreen(13); return; }
    this.ayushIndex--;
    this.showAyushQuestion();
  },

  renderAyushSummary() {
    const container = document.getElementById('ayush-summary-container');
    if (!container) return;
    const q = this.ayushQuestions;
    let rows = q.map(item => {
      const ans = this.ayushAnswers[item.id] || 'Not provided';
      return `<div class="summary-row">
        <div class="summary-label">${item.icon} ${getLocalizedText(item.text, item.text)}</div>
        <div class="summary-val">${getLocalizedText(ans, ans)}</div>
      </div>`;
    }).join('');

    const disclaimerText = getLocalizedText('This AYUSH wellness context is for holistic care reference only. It does not constitute medical diagnosis or treatment advice.', 'This AYUSH wellness context is for holistic care reference only. It does not constitute medical diagnosis or treatment advice.');
    const continueBtnText = getLocalizedText('Continue to Medical Reports', 'Continue to Medical Reports');
    const backBtnText = getLocalizedText('back', 'Back');
    const helpBtnText = getLocalizedText('need_help', 'Need Help?');

    container.innerHTML = `
      <div class="summary-table-card" style="text-align:left;">${rows}</div>
      <div class="ai-safety-alert" style="margin-bottom:20px;">
        <i class="fa-solid fa-leaf" style="font-size:1.3rem;color:#059669;"></i>
        ${disclaimerText}
      </div>
      <button class="btn-kiosk-primary" onclick="App.showScreen(14)">
        ${continueBtnText} <i class="fa-solid fa-arrow-right"></i>
      </button>
      <div class="step-nav-footer">
        <button class="btn-back" onclick="App.ayushIndex=App.ayushQuestions.length-1;App.showAyushQuestion()"><i class="fa-solid fa-arrow-left"></i> ${backBtnText}</button>
        <button class="btn-help-link" onclick="App.toggleHelpModal()"><i class="fa-solid fa-circle-question"></i> ${helpBtnText}</button>
      </div>
    `;
  },

  // ── SUMMARY CARD ─────────────────────────────────────────────────────────
  updateSummaryCard() {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = getLocalizedText(val || 'Not provided', val || 'Not provided');
    };
    
    // Convert arrays or delimited strings correctly for display
    const setListVal = (id, valListStr) => {
      const el = document.getElementById(id);
      if (el) {
        if (!valListStr || valListStr === 'None reported' || valListStr === 'Not provided') {
           el.innerText = getLocalizedText(valListStr || 'Not provided', valListStr || 'Not provided');
           return;
        }
        const parts = valListStr.split('; ').map(p => getLocalizedText(p, p));
        el.innerText = parts.join('; ');
      }
    };
    
    setVal('sum-problem', this.state.chiefComplaint);
    setVal('sum-duration', this.aqAnswers[Object.keys(this.aqAnswers).find(k => k.includes('duration'))] || 'Not specified');
    setVal('sum-location', this.state.bodyLocation);
    setVal('sum-severity', this.aqAnswers[Object.keys(this.aqAnswers).find(k => k.includes('severity'))] || 'Not specified');
    setVal('sum-onset', this.aqAnswers[Object.keys(this.aqAnswers).find(k => k.includes('onset'))] || 'Not specified');
    
    setListVal('sum-associated', this.buildAssociatedSymptomsSummary());
    setVal('sum-aggravating', this.aqAnswers[Object.keys(this.aqAnswers).find(k => k.includes('eating') || k.includes('light') || k.includes('activity'))] || 'Not specified');
    setVal('sum-history', this.patientType === 'existing' ? 'Mild Hypertension (on Amlodipine 5mg)' : 'Not provided');
    setVal('sum-allergies', this.patientType === 'existing' ? 'Penicillin' : 'Not provided');
    setVal('sum-meds', this.patientType === 'existing' ? 'Amlodipine 5mg OD' : 'None');
  },

  buildAssociatedSymptomsSummary() {
    const parts = [];
    Object.entries(this.aqAnswers).forEach(([key, val]) => {
      if ((key.includes('nausea') || key.includes('fever') || key.includes('cough') || key.includes('rash') || key.includes('vomit') || key.includes('throat') || key.includes('chest')) && !val.startsWith('No')) {
        parts.push(val); // Push stable English value
      }
    });
    return parts.length ? parts.join('; ') : 'None reported';
  },

  // ── REPORTS MODULE ────────────────────────────────────────────────────────
  simulateCameraScan() {
    const overlay = document.getElementById('scan-overlay');
    overlay.style.display = 'flex';
    setTimeout(() => {
      overlay.style.display = 'none';
      this.addUploadedReportItem("Photo Scan — Lab Report", new Date().toLocaleDateString('en-IN'));
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
    const itemHtml = `<div class="uploaded-file-item">
      <div><i class="fa-solid fa-file-medical" style="color:var(--primary);margin-right:8px;"></i>
        <strong>${title}</strong> — <span style="color:var(--text-muted);font-size:0.85rem;">${dateStr}</span>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn-kiosk-secondary" style="min-height:34px;padding:4px 10px;width:auto;font-size:0.82rem;" onclick="App.previewReport('${title}')">View</button>
        <button class="btn-kiosk-secondary" style="min-height:34px;padding:4px 10px;width:auto;font-size:0.82rem;border-color:#ef4444;color:#ef4444;" onclick="App.deleteReport(this,'${title}')">Remove</button>
      </div>
    </div>`;
    container.innerHTML += itemHtml;
    this.showNotification(`✅ "${title}" added successfully.`);
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
    // Build rich summary from aqAnswers
    const getSummaryField = (keyIncludes) => {
      const key = Object.keys(this.aqAnswers).find(k => keyIncludes.some(s => k.includes(s)));
      return key ? this.aqAnswers[key] : 'Not provided';
    };
    const newQueuePatient = {
      id: this.state.patientId,
      name: this.state.fullName,
      age: parseInt(this.state.age) || 0,
      gender: this.state.gender,
      time: this.nowTime(),
      status: "Waiting",
      chiefComplaint: this.state.chiefComplaint,
      summary: {
        problem: this.state.chiefComplaint,
        duration: getSummaryField(['duration']),
        severity: getSummaryField(['severity']),
        location: this.state.bodyLocation,
        onset: getSummaryField(['onset']),
        eatingWorse: getSummaryField(['eating','light','activity']),
        nauseaVomiting: getSummaryField(['nausea','vomit']),
        bowel: getSummaryField(['bowel']),
        pastHistory: getSummaryField(['past','previous']),
        medicalHistory: this.patientType === 'existing' ? 'Mild Hypertension' : 'None provided',
        medications: this.patientType === 'existing' ? 'Amlodipine 5mg OD' : 'None',
        allergies: this.patientType === 'existing' ? 'Penicillin' : 'None'
      },
      ayush: {
        completed: this.state.ayushRequested,
        sleep: this.ayushAnswers.ay_sleep || 'Not provided',
        schedule: this.ayushAnswers.ay_schedule || 'Not provided',
        food: this.ayushAnswers.ay_food || 'Not provided',
        digestion: this.ayushAnswers.ay_digestion || 'Not provided',
        activity: this.ayushAnswers.ay_activity || 'Not provided',
        yoga: this.ayushAnswers.ay_yoga || 'Not provided'
      },
      reports: [...this.state.reportsUploaded],
      conversationLog: [...this.state.conversationLog],
      prescriptions: [],
      doctorNotes: ""
    };
    DEMO_DATA.patientQueue.unshift(newQueuePatient);
    this.renderDoctorQueue();
    this.showScreen(15);
  },

  // ── DOCTOR PORTAL ─────────────────────────────────────────────────────────
  loginDoctor() {
    const loginCard = document.getElementById('doctor-login-card');
    const dashboard = document.getElementById('doctor-dashboard-main');
    loginCard.classList.add('hidden');
    loginCard.style.display = 'none';
    dashboard.classList.remove('hidden');
    dashboard.style.display = 'block';
    // Render stat cards
    const q = DEMO_DATA.patientQueue;
    document.getElementById('stat-total').innerText = q.length;
    document.getElementById('stat-waiting').innerText = q.filter(p => p.status === 'Waiting').length;
    document.getElementById('stat-consulting').innerText = q.filter(p => p.status === 'In Consultation').length;
    document.getElementById('stat-completed').innerText = q.filter(p => p.status === 'Completed').length;

    this.renderDoctorQueue();
    this.selectDoctorPatient(DEMO_DATA.patientQueue[0].id);
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
    this.activeDoctorPatient = p;

    document.getElementById('doc-patient-name').innerText = p.name;
    document.getElementById('doc-patient-meta').innerText = `${p.age}y ${p.gender} · ID: ${p.id} · Time: ${p.time}`;
    document.getElementById('doc-patient-status').innerText = p.status;
    document.getElementById('doc-patient-status').style.background = { Waiting:'#fef3c7', 'In Consultation':'#dbeafe', Completed:'#dcfce7' }[p.status] || '#f3f4f6';
    document.getElementById('doc-patient-status').style.color = { Waiting:'#92400e', 'In Consultation':'#1e40af', Completed:'#166534' }[p.status] || '#374151';

    const s = p.summary;
    const setV = (id, val) => { const e = document.getElementById(id); if(e) e.innerText = val || 'Not provided'; };
    setV('doc-sum-complaint', s.problem);
    setV('doc-sum-duration', s.duration);
    setV('doc-sum-location', s.location);
    setV('doc-sum-severity', s.severity);
    setV('doc-sum-onset', s.onset);
    setV('doc-sum-eating', s.eatingWorse);
    setV('doc-sum-nausea', s.nauseaVomiting);
    setV('doc-sum-bowel', s.bowel);
    setV('doc-sum-past', s.pastHistory);
    setV('doc-sum-history', s.medicalHistory);
    setV('doc-sum-meds', s.medications);
    setV('doc-sum-allergies', s.allergies);
    if (p.ayush.completed) {
      setV('doc-sum-ayush', `Sleep: ${p.ayush.sleep} | Diet: ${p.ayush.food} | Digestion: ${p.ayush.digestion} | Yoga: ${p.ayush.yoga}`);
    } else {
      setV('doc-sum-ayush', 'AYUSH survey not completed');
    }

    document.getElementById('doc-notes-textarea').value = p.doctorNotes || "";

    this.renderPrescriptionsList();

    const reportsBox = document.getElementById('doc-reports-list');
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
    this.renderDoctorQueue();
  },

  renderPrescriptionsList() {
    const listTable = document.getElementById('prescriptions-list-table');
    if (!this.activeDoctorPatient) return;
    const rxs = this.activeDoctorPatient.prescriptions || [];
    if (rxs.length === 0) {
      listTable.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No prescriptions added yet.</p>';
      return;
    }
    listTable.innerHTML = `
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
    `;
  },

  addPrescriptionItem() {
    const name = document.getElementById('rx-name').value.trim();
    const dosage = document.getElementById('rx-dosage').value.trim() || '500mg';
    const freq = document.getElementById('rx-freq').value.trim() || '1-0-1';
    const duration = document.getElementById('rx-duration').value.trim() || '5 days';
    const instructions = document.getElementById('rx-instructions').value.trim() || '';
    if (!name) { this.showNotification('⚠️ Please enter medicine name.'); return; }
    if (!this.activeDoctorPatient.prescriptions) this.activeDoctorPatient.prescriptions = [];
    this.activeDoctorPatient.prescriptions.push({ name, dosage, frequency: freq, duration, instructions });
    ['rx-name','rx-dosage','rx-freq','rx-duration','rx-instructions'].forEach(id => {
      const el = document.getElementById(id); if(el) el.value = '';
    });
    this.renderPrescriptionsList();
    this.showNotification(`✅ "${name}" added to prescription.`);
  },

  completeDoctorConsultation() {
    if (!this.activeDoctorPatient) return;
    if (confirm(`Complete consultation for ${this.activeDoctorPatient.name}? This will mark the patient as done.`)) {
      this.activeDoctorPatient.status = "Completed";
      this.activeDoctorPatient.doctorNotes = document.getElementById('doc-notes-textarea').value;
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
    if (p && p.ayush && p.ayush.completed) {
      const fields = [
        ['Sleep Routine', p.ayush.sleep], ['Daily Schedule', p.ayush.schedule], ['Home-cooked Meals', p.ayush.food],
        ['Digestion', p.ayush.digestion], ['Physical Activity', p.ayush.activity], ['Wellness Practices', p.ayush.yoga]
      ];
      body.innerHTML = `<div class="summary-table-card" style="text-align:left;">` +
        fields.map(([label, val]) => `
          <div class="summary-row">
            <div class="summary-label">${label}</div>
            <div class="summary-val">${val || 'Not provided'}</div>
          </div>`).join('') +
        `</div>`;
    } else {
      body.innerHTML = '<p style="color:var(--text-muted);">Patient did not complete AYUSH wellness survey.</p>';
    }
    document.getElementById('ayush-modal').classList.add('active');
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
      ta: 'ta-IN',
      bn: 'bn-IN',
      te: 'te-IN'
  };
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = languageMap[lang] || 'en-IN';
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;
  
  const voices = window.speechSynthesis.getVoices();
  const matchingVoice = voices.find(voice =>
      voice.lang.toLowerCase() === utterance.lang.toLowerCase()
  ) || voices.find(voice =>
      voice.lang.toLowerCase().startsWith(lang)
  );
  
  if (matchingVoice) {
      utterance.voice = matchingVoice;
  }
  
  window.speechSynthesis.speak(utterance);
}
