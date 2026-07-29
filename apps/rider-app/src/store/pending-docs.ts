// In-memory store for pending document URIs during registration flow
interface PendingDoc {
  uri: string;
  fileName: string;
}

let pendingDocs: Record<string, PendingDoc> = {};

export const setPendingDocs = (docs: Record<string, PendingDoc>) => {
  pendingDocs = { ...docs };
};

export const getPendingDocs = () => pendingDocs;

export const clearPendingDocs = () => {
  pendingDocs = {};
};
