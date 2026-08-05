import type { LensOptionGroup } from '../../types';

export const prescriptionGroup: LensOptionGroup = {
  title: 'Prescription',
  required: true,
  type: 'prescription',
  magentoCode: 'prescription_method',
  options: [
    { id: 'manual', title: 'Enter Manually', description: 'Preferred for a fast and complete order review.', price: 0, magentoCode: 'prescription_method' },
    { id: 'upload', title: 'Upload Prescription', description: 'Attach a photo or PDF of the prescription.', price: 0, magentoCode: 'prescription_method' },
    { id: 'saved', title: 'Use Saved Prescription', description: 'Use an existing prescription reference or customer record.', price: 0, magentoCode: 'prescription_method' },
    {
      id: 'later',
      title: 'Send It Later',
      description: 'Complete the order now and send the prescription afterwards.',
      price: 0,
      magentoCode: 'prescription_method',
    },
  ],
};
