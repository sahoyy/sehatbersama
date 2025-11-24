// =============================================
// IMPORT DATA CSV KE SUPABASE
// Jalankan: node importData.js
// =============================================

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config();

// Koneksi Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Helper: Baca CSV jadi Array
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// =============================================
// 1. IMPORT SYMPTOMS (Gejala)
// =============================================
async function importSymptoms() {
  console.log('📥 Importing symptoms...');
  
  const severityData = await readCSV('./data/Symptom-severity.csv');
  
  const symptoms = severityData.map(row => ({
    name: row.Symptom?.trim().replace(/_/g, ' '),
    name_id: row.Symptom?.trim().replace(/_/g, ' '), // Nanti bisa ditranslate
    category: 'general',
    description: `Severity weight: ${row.weight}`
  }));

  // Filter duplicates
  const uniqueSymptoms = [...new Map(symptoms.map(s => [s.name, s])).values()];

  const { data, error } = await supabase
    .from('symptoms')
    .upsert(uniqueSymptoms, { onConflict: 'name' });

  if (error) {
    console.error('❌ Error importing symptoms:', error.message);
  } else {
    console.log(`✅ Imported ${uniqueSymptoms.length} symptoms`);
  }
}

// =============================================
// 2. IMPORT DISEASES (Penyakit)
// =============================================
async function importDiseases() {
  console.log('📥 Importing diseases...');

  const descData = await readCSV('./data/symptom_Description.csv');
  const precautionData = await readCSV('./data/symptom_precaution.csv');

  // Gabungkan description + precaution
  const diseases = descData.map(row => {
    const precaution = precautionData.find(p => p.Disease === row.Disease);
    const precautionText = precaution 
      ? [precaution['Precaution_1'], precaution['Precaution_2'], precaution['Precaution_3'], precaution['Precaution_4']]
          .filter(Boolean).join(', ')
      : '';

    return {
      name: row.Disease?.trim(),
      name_id: row.Disease?.trim(), // Nanti bisa ditranslate
      description: row.Description?.trim(),
      severity: 'moderate', // Default
      recommendation: precautionText
    };
  });

  const { data, error } = await supabase
    .from('diseases')
    .upsert(diseases, { onConflict: 'name' });

  if (error) {
    console.error('❌ Error importing diseases:', error.message);
  } else {
    console.log(`✅ Imported ${diseases.length} diseases`);
  }
}

// =============================================
// 3. IMPORT DISEASE-SYMPTOMS RELATIONSHIP
// =============================================
async function importDiseaseSymptoms() {
  console.log('📥 Importing disease-symptom relationships...');

  const datasetRaw = await readCSV('./data/dataset.csv');
  const severityData = await readCSV('./data/Symptom-severity.csv');

  // Get existing symptoms & diseases from DB
  const { data: symptomsDB } = await supabase.from('symptoms').select('id, name');
  const { data: diseasesDB } = await supabase.from('diseases').select('id, name');

  const symptomMap = new Map(symptomsDB?.map(s => [s.name.toLowerCase(), s.id]) || []);
  const diseaseMap = new Map(diseasesDB?.map(d => [d.name.toLowerCase(), d.id]) || []);
  const severityMap = new Map(severityData.map(s => [s.Symptom?.replace(/_/g, ' ').toLowerCase(), parseFloat(s.weight) || 1]));

  const relationships = [];

  for (const row of datasetRaw) {
    const diseaseName = row.Disease?.trim().toLowerCase();
    const diseaseId = diseaseMap.get(diseaseName);

    if (!diseaseId) continue;

    // Loop through Symptom_1 to Symptom_17
    for (let i = 1; i <= 17; i++) {
      const symptomKey = `Symptom_${i}`;
      const symptomName = row[symptomKey]?.trim().replace(/_/g, ' ').toLowerCase();
      
      if (!symptomName) continue;

      const symptomId = symptomMap.get(symptomName);
      if (!symptomId) continue;

      const weight = severityMap.get(symptomName) || 1;

      relationships.push({
        disease_id: diseaseId,
        symptom_id: symptomId,
        weight: Math.min(weight / 7, 1), // Normalize ke 0-1
        is_primary: i <= 3 // 3 gejala pertama = primary
      });
    }
  }

  // Remove duplicates
  const uniqueRels = [...new Map(
    relationships.map(r => [`${r.disease_id}-${r.symptom_id}`, r])
  ).values()];

  // Insert in batches (Supabase limit)
  const batchSize = 500;
  for (let i = 0; i < uniqueRels.length; i += batchSize) {
    const batch = uniqueRels.slice(i, i + batchSize);
    const { error } = await supabase.from('disease_symptoms').insert(batch);
    if (error) console.error('❌ Batch error:', error.message);
  }

  console.log(`✅ Imported ${uniqueRels.length} disease-symptom relationships`);
}

// =============================================
// 4. IMPORT MEDICATIONS (Obat)
// =============================================
async function importMedications() {
  console.log('📥 Importing medications...');

  const drugsData = await readCSV('./data/drugsComTrain_raw.csv');

  // Get unique drugs dengan kondisinya
  const drugMap = new Map();

  for (const row of drugsData) {
    const drugName = row.drugName?.trim();
    if (!drugName || drugMap.has(drugName)) continue;

    drugMap.set(drugName, {
      name: drugName,
      generic_name: drugName,
      category: row.condition?.trim() || 'General',
      dosage: 'As prescribed',
      frequency: 'As directed by doctor',
      instructions: 'Follow prescription instructions',
      side_effects: 'Consult doctor for side effects',
      price_range: 'Varies'
    });
  }

  const medications = [...drugMap.values()].slice(0, 500); // Limit 500 obat

  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < medications.length; i += batchSize) {
    const batch = medications.slice(i, i + batchSize);
    const { error } = await supabase.from('medications').insert(batch);
    if (error) console.error('❌ Batch error:', error.message);
  }

  console.log(`✅ Imported ${medications.length} medications`);
}

// =============================================
// 5. IMPORT DOCTORS (Generate dummy + real names)
// =============================================
async function importDoctors() {
  console.log('📥 Importing doctors...');

  const specializations = [
    'General Practitioner', 'Cardiologist', 'Dermatologist', 'Neurologist',
    'Pediatrician', 'Orthopedist', 'Ophthalmologist', 'Psychiatrist',
    'Dentist', 'ENT Specialist', 'Pulmonologist', 'Gastroenterologist'
  ];

  const hospitals = [
    'City General Hospital', 'Metro Health Center', 'Sunrise Medical',
    'Golden Heart Hospital', 'Care Plus Clinic', 'Wellness Hospital',
    'Prime Medical Center', 'Hope Hospital', 'Life Care Medical'
  ];

  const firstNames = ['James', 'Sarah', 'Michael', 'Emily', 'David', 'Lisa', 'Robert', 'Anna', 'William', 'Maria'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Lee'];

  const doctors = [];

  for (let i = 0; i < 30; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const spec = specializations[i % specializations.length];
    const hospital = hospitals[Math.floor(Math.random() * hospitals.length)];

    doctors.push({
      name: `Dr. ${firstName} ${lastName}`,
      specialization: spec,
      hospital: hospital,
      location: 'Medical District',
      experience_years: Math.floor(Math.random() * 20) + 5,
      rating: (Math.random() * 1.5 + 3.5).toFixed(1), // 3.5 - 5.0
      consultation_fee: Math.floor(Math.random() * 100 + 50) * 1000, // 50k - 150k
      availability: {
        monday: ['09:00-12:00', '14:00-17:00'],
        tuesday: ['09:00-12:00', '14:00-17:00'],
        wednesday: ['09:00-12:00'],
        thursday: ['09:00-12:00', '14:00-17:00'],
        friday: ['09:00-12:00', '14:00-17:00']
      },
      phone: `+62 812-${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@hospital.com`
    });
  }

  const { error } = await supabase.from('doctors').insert(doctors);

  if (error) {
    console.error('❌ Error importing doctors:', error.message);
  } else {
    console.log(`✅ Imported ${doctors.length} doctors`);
  }
}

// =============================================
// MAIN: Jalankan semua import
// =============================================
async function main() {
  console.log('🚀 Starting data import to Supabase...\n');

  await importSymptoms();
  await importDiseases();
  await importDiseaseSymptoms();
  await importMedications();
  await importDoctors();

  console.log('\n✨ All data imported successfully!');
  process.exit(0);
}

main().catch(console.error);