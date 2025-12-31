
export interface BleedPoint {
  id: string;
  position: [number, number, number];
  size: number;
  severity: 'low' | 'medium' | 'critical';
  isIdentified: boolean;
  isTreated: boolean;
  vesselType: 'artery' | 'vein';
  anatomicalRegion: string;
  vesselName: string;
  // Stages: hidden -> exposed (dura) -> accessible (cortex) -> suctioned -> cauterized -> irrigated
  treatmentStage: 'hidden' | 'exposed' | 'accessible' | 'suctioned' | 'cauterized' | 'irrigated';
  bloodVolume: number; 
  damageToSurrounding: number; // Penalty for imprecise tool use
}

export interface SurgicalStep {
  id: number;
  instruction: string;
  isCompleted: boolean;
  category: 'prep' | 'access' | 'hemostasis' | 'closure';
  requiredTool?: string;
}

export type TraumaPathology = 
  | 'Epidural Hematoma (EDH)' 
  | 'Acute Subdural Hematoma (ASDH)' 
  | 'Intracerebral Hemorrhage (ICH)'
  | 'Depressed Skull Fracture'
  | 'Penetrating Brain Injury'
  | 'Massive Cerebral Edema'
  | 'Posterior Fossa Hemorrhage';

export interface PatientCase {
  id: string;
  name: string;
  age: number;
  sex: 'M' | 'F';
  accidentType: string;
  pathology: TraumaPathology;
  ctReport: string; // Radiologist interpretation
  symptoms: string[];
  initialVitals: {
    heartRate: number;
    systolicBp: number;
    diastolicBp: number;
    oxygenLevel: number;
    intracranialPressure: number;
  };
  bleeds: BleedPoint[];
  surgicalSteps: SurgicalStep[];
  difficulty: 'resident' | 'fellow' | 'consultant';
  isForeignBodyRemoved: boolean; // For Penetrating Injury
}

export interface VitalsData {
  heartRate: number;
  systolicBp: number;
  diastolicBp: number;
  oxygenLevel: number;
  intracranialPressure: number;
  status: 'stable' | 'critical' | 'crashing' | 'brain-dead';
}

export enum GameState {
  LOBBY = 'LOBBY',
  SCRUB_IN = 'SCRUB_IN',
  SURGERY = 'SURGERY',
  DEBRIEF = 'DEBRIEF',
  VICTORY = 'VICTORY'
}
