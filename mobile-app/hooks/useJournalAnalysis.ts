/**
 * hooks/useJournalAnalysis.ts — Custom Hook for RoBERTa & SBERT Journal Analysis
 *
 * Encapsulates:
 * - Content hash caching (MD5-like sourceHash verification)
 * - Automatic background analysis trigger on content change
 * - Integration with backend NLP API (MindfulAPI.analyzeJournal)
 * - AsyncStorage persistent cache syncing
 * - Cancellation handling during rapid screen navigation
 * - Manual re-analysis capability
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildJournalSourceHash,
  readJournalEntries,
  writeJournalEntries,
} from '../lib/journal-storage';
import { MindfulAPI } from '../services/mindfulApi';
import { JournalAnalysisCache } from '../types';

export interface UseJournalAnalysisReturn {
  analysisResult: JournalAnalysisCache | null;
  analysisLoading: boolean;
  analysisError: string | null;
  reAnalyze: () => Promise<void>;
}

export function useJournalAnalysis(
  entryId?: string,
  title: string = '',
  content: string = ''
): UseJournalAnalysisReturn {
  const [analysisResult, setAnalysisResult] = useState<JournalAnalysisCache | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const activeRequestIdRef = useRef<number>(0);

  const performAnalysis = useCallback(
    async (force: boolean = false) => {
      if (!entryId || !content.trim()) {
        setAnalysisResult(null);
        setAnalysisError(null);
        setAnalysisLoading(false);
        return;
      }

      const currentRequestId = ++activeRequestIdRef.current;
      const sourceHash = buildJournalSourceHash(title, content);

      // Check persistent cache first if not forced
      if (!force) {
        try {
          const existingEntries = await readJournalEntries();
          const existingEntry = existingEntries.find((entry) => entry.id === entryId);

          if (existingEntry?.analysis && existingEntry.analysis.sourceHash === sourceHash) {
            setAnalysisResult(existingEntry.analysis);
            setAnalysisError(null);
            setAnalysisLoading(false);
            return;
          }
        } catch (storageErr) {
          console.warn('Failed to read journal cache from storage:', storageErr);
        }
      }

      setAnalysisLoading(true);
      setAnalysisError(null);

      try {
        const analysis = await MindfulAPI.analyzeJournal(content);

        // Guard against race conditions / unmounted triggers
        if (currentRequestId !== activeRequestIdRef.current) {
          return;
        }

        if (analysis.status === 'success') {
          const cacheRecord: JournalAnalysisCache = {
            sourceHash,
            moodScore: analysis.calculated_mood_score ?? 3,
            themes: analysis.overall_themes ?? [],
            semanticThemes: analysis.semantic_themes ?? [],
            emotions: analysis.emotions,
            confidence: analysis.confidence,
            latencyMs: analysis.latency_ms,
            analyzedAt: new Date().toISOString(),
          };

          setAnalysisResult(cacheRecord);

          // Persist to AsyncStorage
          const entries = await readJournalEntries();
          const index = entries.findIndex((entry) => entry.id === entryId);
          if (index >= 0) {
            entries[index] = {
              ...entries[index],
              analysis: cacheRecord,
            };
            await writeJournalEntries(entries);
          }
        } else {
          throw new Error(
            analysis.message || 'Unable to analyze this journal entry right now.'
          );
        }
      } catch (err) {
        if (currentRequestId !== activeRequestIdRef.current) {
          return;
        }
        setAnalysisResult(null);
        setAnalysisError(
          err instanceof Error
            ? err.message
            : 'Keep wearing your watch. We need a little more data to analyze this entry.'
        );
      } finally {
        if (currentRequestId === activeRequestIdRef.current) {
          setAnalysisLoading(false);
        }
      }
    },
    [entryId, title, content]
  );

  useEffect(() => {
    performAnalysis(false);

    return () => {
      // Invalidate current request
      activeRequestIdRef.current++;
    };
  }, [performAnalysis]);

  const reAnalyze = useCallback(async () => {
    await performAnalysis(true);
  }, [performAnalysis]);

  return {
    analysisResult,
    analysisLoading,
    analysisError,
    reAnalyze,
  };
}
