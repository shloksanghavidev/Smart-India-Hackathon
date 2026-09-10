/**
 * MediSarthi — Mock Data & Predefined Clinical Pathways
 */

const DEMO_DATA = {
  // Existing Patient Profiles for quick demo lookup
  existingPatients: [
    {
      id: "MS1001",
      aadhaar: "123456789101",
      name: "Ramesh Patel",
      age: 45,
      gender: "Male",
      mobile: "+91 98201 54321",
      lastVisit: "12 Jul 2026",
      medicalHistory: "Mild Hypertension (on Amlodipine 5mg)",
      allergies: "Penicillin",
      medications: "Amlodipine 5mg OD",
      previousVisits: [
        { date: "12 Jul 2026", summary: "Hypertension follow-up. BP 135/88. Prescribed Amlodipine." },
        { date: "02 Apr 2026", summary: "Seasonal fever. Paracetamol prescribed. Resolved." }
      ]
    }
  ],

  // Patient Queue for Doctor Portal
  patientQueue: [
    {
      id: "MS1001",
      aadhaar: "123456789101",
      name: "Ramesh Patel",
      age: 45,
      gender: "Male",
      time: "09:15 AM",
      status: "Waiting", // Waiting, In Consultation, Completed
      chiefComplaint: "Stomach Pain",
      summary: {
        problem: "Stomach Pain",
        duration: "1 – 3 days",
        severity: "Moderate",
        location: "Around Navel",
        eatingWorse: "Yes (after meals)",
        nauseaVomiting: "Mild Nausea, No Vomiting",
        medicalHistory: "Mild Hypertension",
        medications: "Amlodipine 5mg OD",
        allergies: "Penicillin"
      },
      ayush: {
        completed: true,
        sleep: "7-8 hrs sound sleep",
        diet: "Vegetarian (Spicy food intake)",
        routine: "Regular morning walk"
      },
      reports: [
        { title: "Blood Test (CBC)", date: "20 May 2026", type: "pdf", fileUrl: "#" },
        { title: "Abdominal Ultrasound", date: "18 May 2026", type: "image", fileUrl: "#" },
        { title: "Chest X-Ray", date: "10 May 2026", type: "image", fileUrl: "#" }
      ],
      conversationLog: [
        { sender: "MediSarthi", text: "Welcome to MediSarthi! How long have you had this stomach pain?", time: "09:16 AM" },
        { sender: "Patient", text: "I have stomach pain since three days.", time: "09:16 AM", voice: true },
        { sender: "MediSarthi", text: "Where does it hurt? Please select on the body diagram.", time: "09:17 AM" },
        { sender: "Patient", text: "Selected: Around Navel", time: "09:17 AM" },
        { sender: "MediSarthi", text: "Does eating make the pain worse?", time: "09:17 AM" },
        { sender: "Patient", text: "Yes, after eating lunch it hurts more.", time: "09:18 AM" },
        { sender: "MediSarthi", text: "Do you have nausea or vomiting?", time: "09:18 AM" },
        { sender: "Patient", text: "A little bit of nausea.", time: "09:18 AM" }
      ],
      prescriptions: [
        { name: "Tab Pantoprazole 40mg", dosage: "1 Tab", frequency: "1-0-0", duration: "7 days", instructions: "Before breakfast" },
        { name: "Tab Drotin 80mg", dosage: "1 Tab", frequency: "1-0-1", duration: "3 days", instructions: "After food if pain occurs" }
      ],
      doctorNotes: "Patient presents with epigastric/umbilical tenderness for 2 days. Suspected acute gastritis. Recommended mild dietary modifications."
    }
  ]
};
