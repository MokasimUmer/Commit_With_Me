"use client";

import { useContext } from "react";
import { NdkContext } from "@/components/providers/ndk-provider";

export function useNDK() {
  const context = useContext(NdkContext);
  if (!context) {
    throw new Error("useNDK must be used inside NDKProvider.");
  }
  return context;
}
