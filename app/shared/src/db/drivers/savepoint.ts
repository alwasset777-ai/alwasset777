/**
 * Transactions imbriquables via SAVEPOINT : un service peut appeler un
 * autre service transactionnel sans se soucier du niveau d'imbrication.
 */
export function makeTransaction(exec: (sql: string) => void) {
  let depth = 0;
  return function transaction<T>(fn: () => T): T {
    const name = `sp_${depth}`;
    exec(depth === 0 ? 'BEGIN' : `SAVEPOINT ${name}`);
    depth++;
    try {
      const result = fn();
      depth--;
      exec(depth === 0 ? 'COMMIT' : `RELEASE ${name}`);
      return result;
    } catch (err) {
      depth--;
      if (depth === 0) exec('ROLLBACK');
      else exec(`ROLLBACK TO ${name}; RELEASE ${name}`);
      throw err;
    }
  };
}
