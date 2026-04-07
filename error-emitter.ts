
export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    super(`Missing or insufficient permissions: The following request was denied by Firestore Security Rules:
${JSON.stringify({
  method: context.operation === 'write' ? 'update' : context.operation,
  path: context.path,
  auth: 'Current User UID', // Placeholder, handled by the listener
}, null, 2)}`);
    this.name = 'FirestorePermissionError';
    this.context = context;
  }
}
