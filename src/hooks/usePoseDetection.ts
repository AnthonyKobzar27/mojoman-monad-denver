"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Keypoint } from "@/types";

export function usePoseDetection() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keypoints, setKeypoints] = useState<Keypoint[]>([]);
  const detectorRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const isRunningRef = useRef(false);

  const loadModel = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const tf = await import("@tensorflow/tfjs-core");

      // Try WebGL first, fall back to CPU
      try {
        await import("@tensorflow/tfjs-backend-webgl");
        await tf.setBackend("webgl");
        await tf.ready();
        console.log("TF backend: webgl");
      } catch (webglErr) {
        console.warn("WebGL backend failed, falling back to CPU", webglErr);
        await import("@tensorflow/tfjs-backend-cpu");
        await tf.setBackend("cpu");
        await tf.ready();
        console.log("TF backend: cpu");
      }

      const poseDetection = await import("@tensorflow-models/pose-detection");
      console.log("Creating MoveNet detector...");
      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        }
      );
      console.log("MoveNet detector created successfully");
      detectorRef.current = detector;
      setIsLoading(false);
    } catch (err) {
      console.error("Model load failed:", err);
      // Retry once after 1s with CPU backend
      try {
        await new Promise((r) => setTimeout(r, 1000));
        const tf = await import("@tensorflow/tfjs-core");
        await import("@tensorflow/tfjs-backend-cpu");
        await tf.setBackend("cpu");
        await tf.ready();

        const poseDetection = await import("@tensorflow-models/pose-detection");
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          }
        );
        console.log("MoveNet detector created on retry (CPU)");
        detectorRef.current = detector;
        setIsLoading(false);
      } catch (retryErr) {
        console.error("Model retry also failed:", retryErr);
        setError(
          retryErr instanceof Error ? retryErr.message : "Failed to load model"
        );
        setIsLoading(false);
      }
    }
  }, []);

  const detectPose = useCallback(async (video: HTMLVideoElement) => {
    if (!detectorRef.current || !video || video.readyState < 2) return;

    try {
      const poses = await detectorRef.current.estimatePoses(video);
      if (poses.length > 0 && poses[0].keypoints) {
        setKeypoints(poses[0].keypoints as Keypoint[]);
      }
    } catch {
      // Skip frame on error
    }
  }, []);

  const startDetection = useCallback(
    (video: HTMLVideoElement) => {
      isRunningRef.current = true;
      const loop = async () => {
        if (!isRunningRef.current) return;
        await detectPose(video);
        animFrameRef.current = requestAnimationFrame(loop);
      };
      loop();
    },
    [detectPose]
  );

  const stopDetection = useCallback(() => {
    isRunningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    isLoading,
    error,
    keypoints,
    loadModel,
    startDetection,
    stopDetection,
  };
}
