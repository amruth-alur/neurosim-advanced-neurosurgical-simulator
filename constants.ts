
export const COLORS = {
  BONE: '#f3e5ab', // More natural cream bone color
  DURA: '#e2e8f0', // Shiny whitish-grey
  CORTEX: '#dea5a4', // Pinkish grey
  NERVE: '#fef08a',
  ART_OXY: '#ef4444',
  VEN_DEOXY: '#3b82f6',
  CSF: '#67e8f9', 
  BLOOD_POOL: '#7f1d1d', // Darker, more realistic venous blood
  TREATED: '#1c1917', // Cauterized/Charred
  DEEP_STRUCTURE: '#d8b4fe', 
  SINUS: '#1e40af', 
  // Physiological Hierarchical Colors
  FOREBRAIN_CORTEX_FRONTAL: '#dc2626',   
  FOREBRAIN_CORTEX_PARIETAL: '#0ea5e9',  
  FOREBRAIN_CORTEX_TEMPORAL: '#eab308',  
  FOREBRAIN_CORTEX_OCCIPITAL: '#16a34a', 
  FOREBRAIN_THALAMUS: '#f472b6',         
  FOREBRAIN_HYPOTHALAMUS: '#fb7185',     
  MIDBRAIN: '#c084fc',                   
  HINDBRAIN_PONS: '#a855f7',             
  HINDBRAIN_MEDULLA: '#9333ea',          
  HINDBRAIN_CEREBELLUM: '#92400e',       
};

export const SURGICAL_TOOLS = [
  // Drill removed as Skull model is removed
  { id: 'scalpel', name: 'No. 15 Scalpel', icon: '🔪', description: 'Dural opening: Precision incision of the meninges.' },
  { id: 'forceps', name: 'Bayonet Forceps', icon: '🥢', description: 'Retraction: Gently move neural tissue to visualize vessels.' },
  { id: 'suction', name: 'Frazier Suction', icon: '🥤', description: 'Evacuation: Continuous removal of blood and irrigation fluid.' },
  { id: 'cautery', name: 'Bipolar Cautery', icon: '⚡', description: 'Hemostasis: Thermal sealing of bleeding vessels.' },
  { id: 'irrigation', name: 'Saline Wash', icon: '💧', description: 'Clearing: Wash the field to improve visibility and cool tissue.' },
  { id: 'suture', name: 'Nylon Suture', icon: '🪡', description: 'Closure: Stitching the galea and skin.' },
];

export const ANATOMY_REGIONS = [
  { name: 'Frontal Lobe', pos: [0, 0.4, 0.8], scale: [1.2, 1, 1.3], color: COLORS.FOREBRAIN_CORTEX_FRONTAL },
  { name: 'Parietal Lobe', pos: [0, 0.8, -0.6], scale: [1.1, 0.9, 1], color: COLORS.FOREBRAIN_CORTEX_PARIETAL },
  { name: 'Temporal Lobe', pos: [1.1, -0.4, 0.2], scale: [0.6, 0.6, 0.9], color: COLORS.FOREBRAIN_CORTEX_TEMPORAL },
  { name: 'Occipital Lobe', pos: [0, -0.2, -1.4], scale: [0.9, 0.8, 0.7], color: COLORS.FOREBRAIN_CORTEX_OCCIPITAL }
];

export const CRANIAL_NERVES = [
  { name: 'I. Olfactory', pos: [0.3, 0.1, 1.8], color: COLORS.NERVE },
  { name: 'II. Optic', pos: [0.3, -0.5, 1.4], color: COLORS.NERVE },
  { name: 'III. Oculomotor', pos: [0.2, -0.9, 0.8], color: COLORS.NERVE },
  { name: 'IV. Trochlear', pos: [0.4, -1.0, 0.6], color: COLORS.NERVE },
  { name: 'V. Trigeminal', pos: [0.8, -1.2, 0.2], color: COLORS.NERVE },
  { name: 'VI. Abducens', pos: [0.2, -1.4, 0.3], color: COLORS.NERVE },
  { name: 'VII. Facial', pos: [1.1, -1.5, -0.5], color: COLORS.NERVE },
  { name: 'VIII. Vestibulocochlear', pos: [1.3, -1.6, -0.7], color: COLORS.NERVE },
  { name: 'IX. Glossopharyngeal', pos: [0.6, -1.8, -0.6], color: COLORS.NERVE },
  { name: 'X. Vagus', pos: [0.4, -2.0, -0.5], color: COLORS.NERVE },
  { name: 'XI. Accessory', pos: [0.3, -2.2, -0.7], color: COLORS.NERVE },
  { name: 'XII. Hypoglossal', pos: [0.2, -1.9, 0.1], color: COLORS.NERVE }
];
