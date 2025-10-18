/**
 * Calculate audio file duration in seconds
 * @param file Audio file (Blob or File)
 * @returns Duration in seconds
 */
export async function getAudioDuration(file: Blob | File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);

    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(objectUrl);
      // Round to nearest second
      resolve(Math.ceil(audio.duration));
    });

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load audio file'));
    });

    audio.src = objectUrl;
  });
}
