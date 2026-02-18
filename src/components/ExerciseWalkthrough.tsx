"use client";

import { useState, useEffect } from "react";
import { ExerciseType, EXERCISE_LABELS, EXERCISE_STAT } from "@/types";

interface Props {
  exerciseType: ExerciseType;
  targetReps: number;
  onContinue: () => void;
  isLoading?: boolean;
}

const EXERCISE_EMOJI: Record<ExerciseType, string> = {
  [ExerciseType.Pushups]: "\u{1F4AA}",
  [ExerciseType.Squats]: "\u{1F9B5}",
  [ExerciseType.JumpingJacks]: "\u2B50",
};

const EXERCISE_TIPS: Record<ExerciseType, string> = {
  [ExerciseType.Pushups]: "Keep your core tight and lower until your chest nearly touches the ground",
  [ExerciseType.Squats]: "Feet shoulder-width apart, push your hips back and keep your chest up",
  [ExerciseType.JumpingJacks]: "Jump with arms and legs out wide, then back together in a fluid motion",
};

function PushupAnimation() {
  return (
    <svg viewBox="0 0 200 100" className="w-48 h-24">
      <style>{`
        @keyframes pushup {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(15px); }
        }
        .pushup-body { animation: pushup 1.5s ease-in-out infinite; }
      `}</style>
      <g className="pushup-body">
        {/* Head */}
        <circle cx="160" cy="25" r="10" fill="currentColor" className="text-studio-blue" />
        {/* Body - angled plank */}
        <line x1="150" y1="30" x2="60" y2="45" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-wii-ink" />
        {/* Arms */}
        <line x1="140" y1="35" x2="140" y2="60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-studio-blue" />
        <line x1="100" y1="40" x2="100" y2="60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-studio-blue" />
        {/* Legs */}
        <line x1="60" y1="45" x2="40" y2="65" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-wii-ink" />
        {/* Ground */}
        <line x1="20" y1="65" x2="180" y2="65" stroke="currentColor" strokeWidth="1" strokeDasharray="4" className="text-wii-muted" />
      </g>
    </svg>
  );
}

function SquatAnimation() {
  return (
    <svg viewBox="0 0 120 140" className="w-32 h-36">
      <style>{`
        @keyframes squat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(20px) scaleY(0.85); }
        }
        .squat-body { animation: squat 1.5s ease-in-out infinite; transform-origin: bottom center; }
      `}</style>
      <g className="squat-body">
        {/* Head */}
        <circle cx="60" cy="20" r="10" fill="currentColor" className="text-studio-blue" />
        {/* Torso */}
        <line x1="60" y1="30" x2="60" y2="70" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-wii-ink" />
        {/* Arms */}
        <line x1="60" y1="40" x2="35" y2="55" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-studio-blue" />
        <line x1="60" y1="40" x2="85" y2="55" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-studio-blue" />
        {/* Legs */}
        <line x1="60" y1="70" x2="40" y2="100" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-wii-ink" />
        <line x1="60" y1="70" x2="80" y2="100" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-wii-ink" />
      </g>
      {/* Ground */}
      <line x1="20" y1="105" x2="100" y2="105" stroke="currentColor" strokeWidth="1" strokeDasharray="4" className="text-wii-muted" />
    </svg>
  );
}

function JumpingJackAnimation() {
  return (
    <svg viewBox="0 0 140 140" className="w-36 h-36">
      <style>{`
        @keyframes jjArms {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-45deg); }
        }
        @keyframes jjArmsR {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(45deg); }
        }
        @keyframes jjLegs {
          0%, 100% { transform: translateX(0px); }
          50% { transform: translateX(-8px); }
        }
        @keyframes jjLegsR {
          0%, 100% { transform: translateX(0px); }
          50% { transform: translateX(8px); }
        }
        .jj-arm-l { animation: jjArms 1s ease-in-out infinite; transform-origin: 70px 45px; }
        .jj-arm-r { animation: jjArmsR 1s ease-in-out infinite; transform-origin: 70px 45px; }
        .jj-leg-l { animation: jjLegs 1s ease-in-out infinite; }
        .jj-leg-r { animation: jjLegsR 1s ease-in-out infinite; }
      `}</style>
      {/* Head */}
      <circle cx="70" cy="20" r="10" fill="currentColor" className="text-studio-blue" />
      {/* Torso */}
      <line x1="70" y1="30" x2="70" y2="75" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-wii-ink" />
      {/* Arms */}
      <line x1="70" y1="45" x2="40" y2="60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="jj-arm-l text-studio-blue" />
      <line x1="70" y1="45" x2="100" y2="60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="jj-arm-r text-studio-blue" />
      {/* Legs */}
      <line x1="70" y1="75" x2="50" y2="110" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="jj-leg-l text-wii-ink" />
      <line x1="70" y1="75" x2="90" y2="110" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="jj-leg-r text-wii-ink" />
      {/* Ground */}
      <line x1="20" y1="115" x2="120" y2="115" stroke="currentColor" strokeWidth="1" strokeDasharray="4" className="text-wii-muted" />
    </svg>
  );
}

const EXERCISE_ANIMATIONS: Record<ExerciseType, () => React.ReactNode> = {
  [ExerciseType.Pushups]: PushupAnimation,
  [ExerciseType.Squats]: SquatAnimation,
  [ExerciseType.JumpingJacks]: JumpingJackAnimation,
};

export default function ExerciseWalkthrough({ exerciseType, targetReps, onContinue, isLoading }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [animatedCount, setAnimatedCount] = useState(0);
  const [showContinue, setShowContinue] = useState(false);

  // Auto-advance steps
  useEffect(() => {
    if (currentStep < 2) {
      const timer = setTimeout(() => setCurrentStep((s) => s + 1), 1500);
      return () => clearTimeout(timer);
    } else {
      // Step 3 visible — animate count then show button
      const countDuration = 1000;
      const steps = 20;
      const interval = countDuration / steps;
      let count = 0;
      const counter = setInterval(() => {
        count++;
        setAnimatedCount(Math.round((count / steps) * targetReps));
        if (count >= steps) {
          clearInterval(counter);
          setAnimatedCount(targetReps);
          setTimeout(() => setShowContinue(true), 400);
        }
      }, interval);
      return () => clearInterval(counter);
    }
  }, [currentStep, targetReps]);

  const AnimComponent = EXERCISE_ANIMATIONS[exerciseType];

  return (
    <div className="glass-card p-8 space-y-8">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              i <= currentStep ? "bg-studio-blue scale-110" : "bg-wii-glass"
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="relative min-h-[280px]">
        {/* Step 1: Get Ready */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${
            currentStep === 0 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        >
          <div className="relative mb-6">
            <div className="text-6xl">{EXERCISE_EMOJI[exerciseType]}</div>
            {/* Pulse ring */}
            <div className="absolute inset-0 -m-4 rounded-full border-2 border-studio-blue/40 animate-ping" />
            <div className="absolute inset-0 -m-2 rounded-full border border-studio-blue/20 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-wii-ink mb-2">Get Ready</h2>
          <p className="text-lg font-medium text-studio-blue mb-1">{EXERCISE_LABELS[exerciseType]}</p>
          <p className="text-wii-muted text-center max-w-sm">
            Position your camera so your full body is visible
          </p>
        </div>

        {/* Step 2: Here's the Move */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${
            currentStep === 1 ? "opacity-100 translate-y-0" : currentStep < 1 ? "opacity-0 translate-y-4 pointer-events-none" : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        >
          <div className="mb-4">
            <AnimComponent />
          </div>
          <h2 className="text-2xl font-bold text-wii-ink mb-2">Here&apos;s the Move</h2>
          <p className="text-wii-muted text-center max-w-sm">{EXERCISE_TIPS[exerciseType]}</p>
        </div>

        {/* Step 3: Your Mission */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${
            currentStep === 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <h2 className="text-2xl font-bold text-wii-ink mb-4">Your Mission</h2>
          <div className="text-6xl font-black text-studio-blue mb-2">{animatedCount}</div>
          <p className="text-lg text-wii-ink font-medium mb-1">
            Complete {targetReps} {EXERCISE_LABELS[exerciseType]} to earn MOJO
          </p>
          <div className="px-3 py-1 bg-ring-blue/10 text-ring-blue rounded-full text-sm font-medium border border-ring-blue/20">
            Trains: {EXERCISE_STAT[exerciseType]}
          </div>
        </div>
      </div>

      {/* Continue button */}
      <div
        className={`transition-all duration-500 ${
          showContinue ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <button
          onClick={onContinue}
          disabled={isLoading}
          className="relative w-full py-4 rounded-xl font-bold text-lg text-white transition-all disabled:opacity-60 overflow-hidden bg-gradient-to-r from-studio-blue via-ring-blue to-studio-teal"
        >
          {/* Pulsing glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-studio-blue via-ring-blue to-studio-teal animate-pulse opacity-50 blur-xl" />
          <span className="relative flex items-center justify-center gap-2">
            {isLoading && (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {isLoading ? "Confirm in your wallet..." : "UNLEASH THE MOJO"}
          </span>
        </button>
      </div>
    </div>
  );
}
