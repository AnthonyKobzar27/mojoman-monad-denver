"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import ExercisePicker from "@/components/ExercisePicker";
import ExerciseWalkthrough from "@/components/ExerciseWalkthrough";
import ExerciseCamera from "@/components/ExerciseCamera";
import RepCounter from "@/components/RepCounter";
import ShareSession from "@/components/ShareSession";
import { useExerciseCounter } from "@/hooks/useExerciseCounter";
import { useCreateSession, useResolveSession } from "@/hooks/useSession";
import { useSyncStats, useMyFighter, useCreateFighter } from "@/hooks/useFighter";
import { useBroadcaster } from "@/hooks/useWebRTC";
import { ExerciseType, EXERCISE_LABELS, Keypoint } from "@/types";

type Stage = "pick" | "walkthrough" | "exercising" | "done";

function TxStatusBanner({ isPending, isConfirming, isConfirmed, hash }: {
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  hash?: string;
}) {
  if (!isPending && !isConfirming && !isConfirmed) return null;

  const step = isPending ? 0 : isConfirming ? 1 : 2;
  const steps = [
    { label: "Confirm in wallet", done: step > 0 },
    { label: "Confirming on Monad", done: step > 1 },
    { label: "Session live!", done: step >= 2 },
  ];

  if (isConfirmed) {
    return (
      <div className="bg-mojo-green/10 border border-mojo-green/30 rounded-xl px-4 py-2 flex items-center gap-2">
        <span className="text-mojo-green text-sm font-medium">Session confirmed on-chain</span>
      </div>
    );
  }

  return (
    <div className="bg-studio-blue/5 border border-studio-blue/20 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {s.done ? (
              <div className="w-4 h-4 rounded-full bg-mojo-green flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : i === step ? (
              <div className="w-4 h-4 border-2 border-studio-blue border-t-transparent rounded-full animate-spin" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-wii-glass" />
            )}
            <span className={`text-xs ${i === step ? "text-studio-blue font-medium" : s.done ? "text-mojo-green" : "text-wii-muted"}`}>
              {s.label}
            </span>
            {i < 2 && <span className="text-wii-glass mx-1">—</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExercisePage() {
  const { address, isConnected } = useAccount();
  const [stage, setStage] = useState<Stage>("pick");
  const [exerciseType, setExerciseType] = useState<ExerciseType>(ExerciseType.Pushups);
  const [targetReps, setTargetReps] = useState(10);
  const [sessionId, setSessionId] = useState<bigint | null>(null);

  const { reps, phase, processKeypoints, reset } = useExerciseCounter(exerciseType);
  const { createSession, isPending: isCreating, isConfirming, isSuccess: sessionCreated, hash: createHash, sessionId: createdSessionId } = useCreateSession();
  const { resolveSession, isPending: isResolving, isSuccess: sessionResolved } = useResolveSession();
  const { syncStats } = useSyncStats();
  const { fighter } = useMyFighter();
  const { createFighter } = useCreateFighter();
  const { isStreaming, viewerCount, startBroadcasting, sendRepUpdate, stopBroadcasting } = useBroadcaster(
    sessionId !== null ? sessionId.toString() : null
  );

  const prevReps = useRef(0);

  useEffect(() => {
    if (reps !== prevReps.current) {
      prevReps.current = reps;
      sendRepUpdate(reps);
    }
  }, [reps, sendRepUpdate]);

  // When user clicks "Start Session" in picker, go to walkthrough
  const handleStart = useCallback(
    (type: ExerciseType, target: number) => {
      setExerciseType(type);
      setTargetReps(target);
      reset();
      setStage("walkthrough");
    },
    [reset]
  );

  // When user clicks continue in walkthrough, create the actual session
  const handleWalkthroughContinue = useCallback(() => {
    if (!isConnected) {
      setSessionId(BigInt(Date.now()));
      setStage("exercising");
      return;
    }
    createSession(exerciseType, BigInt(targetReps));
  }, [isConnected, createSession, exerciseType, targetReps]);

  // Optimistic: go to exercising as soon as wallet signs (hash exists)
  useEffect(() => {
    if (createHash && stage === "walkthrough") {
      setStage("exercising");
    }
  }, [createHash, stage]);

  // Set the real session ID once tx confirms
  useEffect(() => {
    if (sessionCreated && createdSessionId !== undefined) {
      setSessionId(createdSessionId);
    }
  }, [sessionCreated, createdSessionId]);

  const handleStreamReady = useCallback(
    (stream: MediaStream) => {
      startBroadcasting(stream);
    },
    [startBroadcasting]
  );

  const handleStop = useCallback(() => {
    stopBroadcasting();
    if (sessionId !== null && isConnected) {
      resolveSession(sessionId, BigInt(reps));
    }
    setStage("done");
  }, [sessionId, reps, isConnected, resolveSession, stopBroadcasting]);

  const handleSyncFighter = useCallback(() => {
    if (sessionId !== null) {
      if (!fighter?.exists) {
        createFighter();
      } else {
        syncStats(sessionId);
      }
    }
  }, [sessionId, fighter, createFighter, syncStats]);

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="glass-card p-12 text-center">
          <h2 className="text-2xl font-semibold text-wii-ink mb-4">Connect Your Wallet</h2>
          <p className="text-wii-muted mb-2">Connect your wallet to start an exercise session on Monad.</p>
          <p className="text-wii-muted/70 text-sm">Or just try the exercise detection below without wallet!</p>
        </div>

        <div className="mt-8">
          {stage === "pick" && <ExercisePicker onStart={handleStart} />}
          {stage === "walkthrough" && (
            <ExerciseWalkthrough
              exerciseType={exerciseType}
              targetReps={targetReps}
              onContinue={handleWalkthroughContinue}
            />
          )}
          {stage === "exercising" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-wii-ink">{EXERCISE_LABELS[exerciseType]} (Demo)</h2>
                <button
                  onClick={handleStop}
                  className="px-4 py-2 bg-mojo-red hover:bg-mojo-red/90 rounded-xl font-medium text-white transition-colors"
                >
                  Stop
                </button>
              </div>
              <ExerciseCamera
                exerciseType={exerciseType}
                onKeypoints={processKeypoints}
                isActive={true}
              />
              <RepCounter reps={reps} target={targetReps} phase={phase} />
            </div>
          )}
          {stage === "done" && (
            <ResultsScreen
              reps={reps}
              targetReps={targetReps}
              exerciseType={exerciseType}
              onRestart={() => { setStage("pick"); reset(); }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold text-wii-ink mb-8">Exercise Session</h1>

      {stage === "pick" && (
        <ExercisePicker onStart={handleStart} disabled={isCreating} />
      )}

      {stage === "walkthrough" && (
        <ExerciseWalkthrough
          exerciseType={exerciseType}
          targetReps={targetReps}
          onContinue={handleWalkthroughContinue}
          isLoading={isCreating}
        />
      )}

      {stage === "exercising" && (
        <div className="space-y-4">
          {/* Tx status banner — shows during confirmation */}
          <TxStatusBanner
            isPending={isCreating}
            isConfirming={isConfirming}
            isConfirmed={sessionCreated}
            hash={createHash}
          />

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-wii-ink">{EXERCISE_LABELS[exerciseType]}</h2>
              {isStreaming && (
                <p className="text-sm text-studio-teal">{viewerCount} viewer{viewerCount !== 1 ? "s" : ""} watching</p>
              )}
            </div>
            <button
              onClick={handleStop}
              disabled={isResolving || !sessionCreated}
              className="px-6 py-2 bg-mojo-red hover:bg-mojo-red/90 rounded-xl font-medium text-white transition-colors disabled:opacity-50"
            >
              {isResolving ? "Resolving..." : !sessionCreated ? "Warming up..." : "Stop & Submit"}
            </button>
          </div>
          <ExerciseCamera
            exerciseType={exerciseType}
            onKeypoints={processKeypoints}
            onStreamReady={handleStreamReady}
            isActive={true}
          />
          <RepCounter reps={reps} target={targetReps} phase={phase} />
          {isStreaming && sessionId !== null && (
            <ShareSession sessionId={sessionId.toString()} />
          )}
        </div>
      )}

      {stage === "done" && (
        <ResultsScreen
          reps={reps}
          targetReps={targetReps}
          exerciseType={exerciseType}
          onRestart={() => { setStage("pick"); reset(); }}
          onSyncFighter={handleSyncFighter}
          showSync={isConnected}
        />
      )}
    </div>
  );
}

function ResultsScreen({
  reps,
  targetReps,
  exerciseType,
  onRestart,
  onSyncFighter,
  showSync,
}: {
  reps: number;
  targetReps: number;
  exerciseType: ExerciseType;
  onRestart: () => void;
  onSyncFighter?: () => void;
  showSync?: boolean;
}) {
  const targetMet = reps >= targetReps;
  const mojoEarned = reps * 10;

  return (
    <div className="glass-card p-8 text-center space-y-6">
      <div className={`text-4xl font-semibold ${targetMet ? "text-mojo-green" : "text-ring-orange"}`}>
        {targetMet ? "Target Met!" : "Session Complete"}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-wii-mist rounded-xl p-4">
          <div className="text-2xl font-bold text-wii-ink">{reps}</div>
          <div className="text-sm text-wii-muted">Reps Done</div>
        </div>
        <div className="bg-wii-mist rounded-xl p-4">
          <div className="text-2xl font-bold text-wii-ink">{targetReps}</div>
          <div className="text-sm text-wii-muted">Target</div>
        </div>
        <div className="bg-wii-mist rounded-xl p-4">
          <div className="text-2xl font-bold text-studio-blue">{mojoEarned}</div>
          <div className="text-sm text-wii-muted">MOJO Earned</div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onRestart}
          className="px-6 py-2.5 bg-studio-blue hover:bg-studio-blue/90 rounded-full font-medium text-white transition-colors"
        >
          New Session
        </button>
        {showSync && onSyncFighter && (
          <button
            onClick={onSyncFighter}
            className="px-6 py-2.5 bg-ring-blue hover:bg-ring-blue/90 rounded-full font-medium text-white transition-colors"
          >
            Sync to Fighter
          </button>
        )}
      </div>
    </div>
  );
}
