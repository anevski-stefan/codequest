import { explainText, onboardingText, ciSummaryText } from './data';

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

export const streamCiSummary = (repo: string, onChunk: (t: string) => void, onDone: () => void) =>
  streamText(ciSummaryText(repo), onChunk, onDone);
