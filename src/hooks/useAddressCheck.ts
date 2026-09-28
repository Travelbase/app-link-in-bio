import { useEffect, useState } from "react";
import { isAddressTaken } from "@/lib/linkinbio/api";
import { addressError } from "@/lib/linkinbio/validation";
import { uiText } from "@/lib/uiText";

export type AddressCheck = { state: "idle" | "checking" | "ok" | "error"; message: string | null };

/** Live format + uniqueness check for a web address (debounced). */
export function useAddressCheck(address: string, exceptId?: string, skip?: boolean): AddressCheck {
  const [result, setResult] = useState<AddressCheck>({ state: "idle", message: null });
  useEffect(() => {
    if (skip) return setResult({ state: "idle", message: null });
    const fmt = addressError(address);
    if (fmt) return setResult({ state: "error", message: fmt });
    setResult({ state: "checking", message: null });
    let cancelled = false;
    const id = window.setTimeout(async () => {
      try {
        const taken = await isAddressTaken(address, exceptId);
        if (!cancelled) setResult(taken ? { state: "error", message: uiText.editor.address.taken } : { state: "ok", message: null });
      } catch {
        if (!cancelled) setResult({ state: "error", message: uiText.errorBody });
      }
    }, 400);
    return () => { cancelled = true; window.clearTimeout(id); };
  }, [address, exceptId, skip]);
  return result;
}
