import babyAnneImage from '../Pictures/momo.jpg';

const equipmentImageOverrides: Record<string, string> = {
  ベビーアン: babyAnneImage
};

export const resolveEquipmentImage = (name: string, imageUrl?: string) => {
  return imageUrl || equipmentImageOverrides[name];
};
