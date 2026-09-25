import { explainText, onboardingText } from './data';

// Simulates the backend's SSE streams by emitting a few words at a time.
const streamText = async (text: string, onChunk: (t: string) => void, onDone: () => void) => {
  await new Promise(r => setTimeout(r, 600));
  const tokens = text.match(/\S+\s*|\s+/g) ?? [];
  for (let i = 0; i < tokens.length; i += 3) {
    onChunk(tokens.slice(i, i + 3).join(''));
    await new Promise(r => setTimeout(r, 28));
  }
  onDone();
};

export const streamExplain = (title: string, repo: string, onChunk: (t: string) => void, onDone: () => void) =>
  streamText(explainText(title, repo), onChunk, onDone);

export const streamOnboarding = (repo: string, onChunk: (t: string) => void, onDone: () => void) =>
  streamText(onboardingText(repo), onChunk, onDone);
