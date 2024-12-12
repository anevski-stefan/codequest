export const getStateColor = (state: string) => {
  switch (state.toLowerCase()) {
    case 'open':
      return 'bg-green-100 text-green-800';
    case 'closed':
      return 'bg-red-100 text-red-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    case 'not planned':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getLabelColors = (color: string) => {
  // Convert hex to RGB to check brightness
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  
  // Calculate perceived brightness using YIQ formula
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  return {
    backgroundColor: `#${color}`,
    color: yiq >= 128 ? '#000000' : '#ffffff'  // Use black text for light backgrounds, white for dark
  };
}; 