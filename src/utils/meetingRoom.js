export const usesPhysicalRoom = (meetingType) => {
  const normalizedType = String(meetingType || 'luring')
    .trim()
    .toLowerCase();

  // Hybrid tetap memakai ruangan walaupun keterangannya juga menyebut online.
  if (normalizedType.includes('hybrid')) return true;

  return !(
    normalizedType.includes('daring') || normalizedType.includes('online')
  );
};
