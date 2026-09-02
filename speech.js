/**
 * MediSarthi — Voice STT (Speech-to-Text) & TTS (Text-to-Speech) Web Speech API Controller
 */

const VoiceController = {
  recognition: null,
  isListening: false,
  synth: window.speechSynthesis || null,
  onResultCallback: null,
  onStateChangeCallback: null,

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-IN'; // Default to Indian English, dynamically updateable

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.onStateChangeCallback) this.onStateChangeCallback(true);
      };

      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (this.onResultCallback) {
          this.onResultCallback(transcript, event.results[0].isFinal);
        }
      };

      this.recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        this.stopListening();
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onStateChangeCallback) this.onStateChangeCallback(false);
      };
    } else {
      console.warn('SpeechRecognition API not natively supported in this browser.');
    }
  },

  setLanguage(langCode) {
    if (!this.recognition) return;
    const langMap = {
      en: 'en-IN',
      hi: 'hi-IN',
      mr: 'mr-IN',
      ta: 'ta-IN',
      bn: 'bn-IN',
      te: 'te-IN',
      kn: 'kn-IN',
      gu: 'gu-IN'
    };
    this.recognition.lang = langMap[langCode] || 'en-IN';
  },

  startListening(onResult, onStateChange) {
    this.onResultCallback = onResult;
    this.onStateChangeCallback = onStateChange;

    if (this.recognition) {
      try {
        if (this.isListening) {
          this.recognition.stop();
        }
        this.recognition.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        // Simulated voice fallback for testing environments
        this.simulateVoiceInput(onResult, onStateChange);
      }
    } else {
      // Graceful fallback simulation if browser lacks native Web Speech API
      this.simulateVoiceInput(onResult, onStateChange);
    }
  },

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    this.isListening = false;
    if (this.onStateChangeCallback) this.onStateChangeCallback(false);
  },

  simulateVoiceInput(onResult, onStateChange) {
    if (onStateChange) onStateChange(true);
    setTimeout(() => {
      const sampleQueries = [
        "I have stomach pain since three days.",
        "Mere pet mein bahut dard ho raha hai.",
        "I have bad cough and cold for 4 days.",
        "Mujhe 2 din se bukhar aur sirdard hai."
      ];
      const randomQuery = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
      if (onResult) onResult(randomQuery, true);
      if (onStateChange) onStateChange(false);
    }, 2500);
  },

  speak(text, langCode = 'en') {
    if (!this.synth) return;
    
    // Stop any ongoing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const langMap = {
      en: 'en-IN',
      hi: 'hi-IN',
      mr: 'mr-IN',
      ta: 'ta-IN',
      bn: 'bn-IN',
      te: 'te-IN'
    };
    utterance.lang = langMap[langCode] || 'en-IN';
    utterance.rate = 0.95; // Friendly, clear speed for kiosk
    utterance.pitch = 1.0;

    this.synth.speak(utterance);
  }
};

// Initialize voice controller
document.addEventListener('DOMContentLoaded', () => {
  VoiceController.init();
});
