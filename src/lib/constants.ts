export const ICD10_CODES: { code: string; description: string; category: string }[] = [
  { code: 'J00', description: 'Acute nasopharyngitis [common cold]', category: 'Respiratory' },
  { code: 'J01', description: 'Acute sinusitis', category: 'Respiratory' },
  { code: 'J02', description: 'Acute pharyngitis', category: 'Respiratory' },
  { code: 'J03', description: 'Acute tonsillitis', category: 'Respiratory' },
  { code: 'J06', description: 'Acute upper respiratory infection, multiple sites', category: 'Respiratory' },
  { code: 'J11', description: 'Influenza, virus not identified', category: 'Respiratory' },
  { code: 'J20', description: 'Acute bronchitis', category: 'Respiratory' },
  { code: 'J45', description: 'Asthma', category: 'Respiratory' },
  { code: 'A00', description: 'Cholera', category: 'Infectious' },
  { code: 'A01', description: 'Typhoid and paratyphoid fevers', category: 'Infectious' },
  { code: 'A09', description: 'Infectious gastroenteritis and colitis', category: 'Infectious' },
  { code: 'B50', description: 'Plasmodium falciparum malaria', category: 'Infectious' },
  { code: 'B54', description: 'Unspecified malaria', category: 'Infectious' },
  { code: 'E11', description: 'Type 2 diabetes mellitus', category: 'Endocrine' },
  { code: 'E10', description: 'Type 1 diabetes mellitus', category: 'Endocrine' },
  { code: 'E03', description: 'Other hypothyroidism', category: 'Endocrine' },
  { code: 'I10', description: 'Essential (primary) hypertension', category: 'Cardiovascular' },
  { code: 'I20', description: 'Angina pectoris', category: 'Cardiovascular' },
  { code: 'I50', description: 'Heart failure', category: 'Cardiovascular' },
  { code: 'K29', description: 'Gastritis and duodenitis', category: 'Digestive' },
  { code: 'K35', description: 'Acute appendicitis', category: 'Digestive' },
  { code: 'N39', description: 'Urinary tract infection, site not specified', category: 'Genitourinary' },
  { code: 'N18', description: 'Chronic kidney disease', category: 'Genitourinary' },
  { code: 'M54', description: 'Back pain', category: 'Musculoskeletal' },
  { code: 'M25', description: 'Other joint disorder', category: 'Musculoskeletal' },
  { code: 'R50', description: 'Fever of unknown origin', category: 'Symptoms' },
  { code: 'R51', description: 'Headache', category: 'Symptoms' },
  { code: 'R10', description: 'Abdominal pain', category: 'Symptoms' },
  { code: 'R05', description: 'Cough', category: 'Symptoms' },
  { code: 'R42', description: 'Dizziness and giddiness', category: 'Symptoms' },
  { code: 'F32', description: 'Depressive episode', category: 'Mental' },
  { code: 'F41', description: 'Anxiety disorder', category: 'Mental' },
  { code: 'S82', description: 'Fracture of lower leg', category: 'Injury' },
  { code: 'S52', description: 'Fracture of forearm', category: 'Injury' },
];

export const LAB_TEST_CATEGORIES = [
  'Hematology',
  'Biochemistry',
  'Microbiology',
  'Serology',
  'Urinalysis',
  'Imaging',
  'Pathology',
  'Endocrinology',
];

export interface LabTestCatalogItem {
  name: string;
  category: string;
  price: number;
  description: string;
  turnaround: string;
}

export const LAB_TEST_CATALOG: LabTestCatalogItem[] = [
  { name: 'Full Blood Count (CBC/FBC)', category: 'Hematology', price: 15000, description: 'Hemoglobin, WBC, platelets, RBC count', turnaround: 'Same day' },
  { name: 'Malaria Rapid Test / Blood Smear', category: 'Serology', price: 5000, description: 'Rapid diagnostic + microscopic smear', turnaround: '1 hour' },
  { name: 'Fasting Blood Sugar (FBS)', category: 'Biochemistry', price: 5000, description: 'Glucose level after 8hr fast', turnaround: 'Same day' },
  { name: 'HbA1c', category: 'Biochemistry', price: 25000, description: '3-month average blood glucose', turnaround: '1-2 days' },
  { name: 'Thyroid Function Test (TSH, T3, T4)', category: 'Endocrinology', price: 40000, description: 'Full thyroid panel', turnaround: '2-3 days' },
  { name: 'Liver Function Tests (LFT)', category: 'Biochemistry', price: 30000, description: 'ALT, AST, bilirubin, albumin, GGT', turnaround: 'Same day' },
  { name: 'Kidney Function Tests (KFT)', category: 'Biochemistry', price: 30000, description: 'Creatinine, urea, electrolytes, eGFR', turnaround: 'Same day' },
  { name: 'Typhoid & Brucella Panel', category: 'Serology', price: 15000, description: 'Widal test + Brucella agglutination', turnaround: 'Same day' },
  { name: 'Lipid Profile (Cholesterol)', category: 'Biochemistry', price: 25000, description: 'Total cholesterol, HDL, LDL, triglycerides', turnaround: 'Same day' },
  { name: 'Urinalysis (Culture & Routine)', category: 'Urinalysis', price: 15000, description: 'Dipstick + microscopy + culture', turnaround: '2-3 days' },
];

export const COMMON_LAB_TESTS = LAB_TEST_CATALOG.map((t) => ({ name: t.name, category: t.category }));

export const PAYMENT_METHODS = {
  mobile: [
    { id: 'mpesa', name: 'M-Pesa', provider: 'Vodacom', color: 'bg-green-500', textColor: 'text-white', icon: '📱' },
    { id: 'tigo', name: 'Tigo Pesa', provider: 'Tigo', color: 'bg-blue-500', textColor: 'text-white', icon: '📱' },
    { id: 'airtel', name: 'Airtel Money', provider: 'Airtel', color: 'bg-red-500', textColor: 'text-white', icon: '📱' },
    { id: 'azam', name: 'Azam Pay', provider: 'Azam', color: 'bg-orange-500', textColor: 'text-white', icon: '📱' },
  ],
  bank: [
    { id: 'crdb', name: 'CRDB Bank', provider: 'CRDB', color: 'bg-blue-700', textColor: 'text-white', icon: '🏦' },
    { id: 'nmb', name: 'NMB Bank', provider: 'NMB', color: 'bg-yellow-500', textColor: 'text-slate-900', icon: '🏦' },
  ],
  card: [
    { id: 'visa', name: 'Visa', provider: 'Visa', color: 'bg-slate-800', textColor: 'text-white', icon: '💳' },
    { id: 'mastercard', name: 'Mastercard', provider: 'Mastercard', color: 'bg-orange-600', textColor: 'text-white', icon: '💳' },
  ],
};

export const COMMON_MEDICATIONS = [
  'Paracetamol', 'Amoxicillin', 'Metformin', 'Amlodipine', 'Omeprazole',
  'Artemether/Lumefantrine (ALu)', 'Ciprofloxacin', 'Ibuprofen', 'Cetirizine',
  'Salbutamol Inhaler', 'Hydrochlorothiazide', 'Atenolol', 'Metronidazole',
  'Azithromycin', 'Folic Acid', 'Ferrous Sulphate', 'ORS (Oral Rehydration Salts)',
  'Co-trimoxazole', 'Diclofenac', 'Ranitidine',
];

export const DOSAGES = ['250mg', '500mg', '5mg', '10mg', '20mg', '1g', '2.5mg', '25mg', '50mg', '100mg', '200mg', '400mg', '600mg', '800mg'];
export const FREQUENCIES = ['Once daily', 'Twice daily', '3 times daily', '4 times daily', 'As needed', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'At bedtime'];
export const DURATIONS = ['3 days', '5 days', '7 days', '10 days', '14 days', '1 month', '3 months', 'Ongoing'];

export const MEDICATION_PRICES: Record<string, number> = {
  'Paracetamol': 2000,
  'Amoxicillin': 5000,
  'Metformin': 8000,
  'Amlodipine': 6000,
  'Omeprazole': 7000,
  'Artemether/Lumefantrine (ALu)': 3000,
  'Ciprofloxacin': 6000,
  'Ibuprofen': 3000,
  'Cetirizine': 4000,
  'Salbutamol Inhaler': 15000,
  'Hydrochlorothiazide': 5000,
  'Atenolol': 5000,
  'Metronidazole': 4000,
  'Azithromycin': 10000,
  'Folic Acid': 1500,
  'Ferrous Sulphate': 2500,
  'ORS (Oral Rehydration Salts)': 1000,
  'Co-trimoxazole': 4000,
  'Diclofenac': 3000,
  'Ranitidine': 5000,
};
