let pendingSelfieUri: string | null = null;

export const setPendingSelfie = (uri: string) => { pendingSelfieUri = uri; };
export const getPendingSelfie = () => pendingSelfieUri;
export const clearPendingSelfie = () => { pendingSelfieUri = null; };
