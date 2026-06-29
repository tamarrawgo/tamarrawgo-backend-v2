let pendingSelfieBase64: string | null = null;
let pendingSelfieUri: string | null = null;

export const setPendingSelfie = (uri: string, base64: string) => { pendingSelfieUri = uri; pendingSelfieBase64 = base64; };
export const getPendingSelfieBase64 = () => pendingSelfieBase64;
export const getPendingSelfieUri = () => pendingSelfieUri;
export const clearPendingSelfie = () => { pendingSelfieBase64 = null; pendingSelfieUri = null; };
