export const MODEL_FILE_REGEX = /\/Kokoro-82M.*\.(onnx|bin|json|params|safetensors)$/i;

export function isModelFile(url: string): boolean {
  return MODEL_FILE_REGEX.test(url);
}