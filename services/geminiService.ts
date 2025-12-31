
import { GoogleGenAI, Type } from "@google/genai";
import { PatientCase, BleedPoint, SurgicalStep } from "../types";

// Removed global 'ai' instance to comply with guideline of creating right before call

const patientSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    age: { type: Type.NUMBER },
    sex: { type: Type.STRING },
    accidentType: { type: Type.STRING },
    pathology: { 
      type: Type.STRING, 
    },
    ctReport: { type: Type.STRING, description: "Radiologist's concise report of the CT Scan findings." },
    symptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
    initialVitals: {
      type: Type.OBJECT,
      properties: {
        heartRate: { type: Type.NUMBER },
        systolicBp: { type: Type.NUMBER },
        diastolicBp: { type: Type.NUMBER },
        oxygenLevel: { type: Type.NUMBER },
        intracranialPressure: { type: Type.NUMBER },
      },
      required: ["heartRate", "systolicBp", "diastolicBp", "oxygenLevel", "intracranialPressure"]
    },
    surgicalSteps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          instruction: { type: Type.STRING },
          category: { type: Type.STRING },
          requiredTool: { type: Type.STRING }
        }
      }
    }
  },
  required: ["name", "age", "sex", "accidentType", "pathology", "ctReport", "symptoms", "initialVitals", "surgicalSteps"]
};

export const generateEmergencyCase = async (forcedPathology?: string): Promise<PatientCase> => {
  // Initialize Gemini right before use as per best practices
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let promptText = `Generate a high-stakes neurosurgery trauma case due to a serious accident. `;
  
  if (forcedPathology) {
    promptText += `STRICTLY generate a case with the pathology: "${forcedPathology}". Ensure all vitals and reports match this condition perfectly.`;
  } else {
    promptText += `Focus on INTERNAL INJURY mechanics (e.g., deceleration shear, coup-contrecoup). 
    Select ONE specific pathology:
    1. Intracerebral Hemorrhage (ICH): Deep internal tissue bleed.
    2. Massive Cerebral Edema: Swelling due to diffuse axonal injury.
    3. Acute Subdural Hematoma (ASDH): Venous tearing.
    4. Penetrating Brain Injury: Foreign object accident.
    5. Epidural Hematoma (EDH).`;
  }

  promptText += `\nEnsure vitals match the internal injury severity (e.g., Cushing's triad for high ICP).`;
  promptText += `\nIMPORTANT: The simulation starts AFTER the bone flap has been removed. DO NOT include steps for 'Drilling', 'Craniotomy', or 'Bone Removal'. The first step should be 'Inspect Dura' or 'Remove Foreign Body' or 'Incise Dura'.`;

  // Using gemini-3-pro-preview for complex medical scenario generation tasks
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: promptText,
    config: {
      responseMimeType: "application/json",
      responseSchema: patientSchema,
      systemInstruction: "You are a senior consultant at AIIMS Trauma Center. Create varied, medically accurate scenarios focusing on internal brain trauma. Assume the skull is already opened."
    }
  });

  const rawData = JSON.parse(response.text);
  
  // LOGIC TO POSITION BLEEDS BASED ON PATHOLOGY
  const pathology = rawData.pathology;
  const regions = ['Frontal', 'Temporal', 'Parietal', 'Occipital'];
  
  let bleedCount = 1;
  if (pathology.includes('Subdural') || pathology.includes('Intracerebral')) bleedCount = 3;
  if (pathology.includes('Edema')) bleedCount = 4; // Diffuse

  const bleeds: BleedPoint[] = Array.from({ length: bleedCount }).map((_, i) => {
    let radius = 0.95; 
    let theta = Math.random() * Math.PI * 2;
    let phi = Math.acos((Math.random() * 2) - 1);
    let size = 0.3; 
    let vesselName = "Cortical Vessel";
    let vesselType: 'artery' | 'vein' = 'vein';
    let region = regions[Math.floor(Math.random() * regions.length)];

    if (pathology.includes('Epidural')) {
      radius = 1.0; 
      theta = Math.PI / 4; 
      phi = Math.PI / 2;
      size = 0.5;
      vesselName = "Middle Meningeal Artery";
      vesselType = 'artery';
      region = "Temporal Lobe";
    } 
    else if (pathology.includes('Posterior Fossa')) {
      radius = 0.8;
      theta = Math.PI; 
      phi = Math.PI * 0.8; 
      vesselName = "PICA / Vertebral Art. Branch";
      vesselType = 'artery';
      region = "Cerebellum";
    }
    else if (pathology.includes('Penetrating')) {
      radius = 0.95; 
      theta = 0;
      phi = Math.PI / 2;
      vesselName = "Traumatized Cortical Vessel";
    }
    else if (pathology.includes('Intracerebral')) {
      radius = 0.4; 
      vesselName = "Lenticulostriate Artery";
      vesselType = 'artery';
    }

    return {
      id: `bleed-${i}`,
      position: [
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      ],
      size: size + (Math.random() * 0.15),
      severity: i === 0 ? 'critical' : 'medium',
      isIdentified: false,
      isTreated: false,
      vesselType,
      vesselName,
      anatomicalRegion: region,
      treatmentStage: 'hidden',
      bloodVolume: 1.0, 
      damageToSurrounding: 0
    };
  });

  return {
    ...rawData,
    id: Math.random().toString(36).substr(2, 9).toUpperCase(),
    bleeds,
    difficulty: pathology.includes('Edema') || pathology.includes('Posterior') ? 'consultant' : 'fellow',
    isForeignBodyRemoved: !pathology.includes('Penetrating') 
  };
};

export const getRealTimeGuidance = async (caseData: PatientCase, vitals: any, logs: string[]) => {
  // Initialize Gemini right before use as per best practices
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Using gemini-3-flash-preview for real-time surgical guidance tasks
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Pathology: ${caseData.pathology}. CT: ${caseData.ctReport}. Vitals: ${JSON.stringify(vitals)}. Logs: ${logs.join(' -> ')}.
    Identify the next immediate surgical step.`,
    config: {
      systemInstruction: "You are the attending neurosurgeon at AIIMS. Short, sharp commands. Reference the CT scan findings if relevant."
    }
  });
  return response.text;
};
