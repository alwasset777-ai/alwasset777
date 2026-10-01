declare module 'sql.js/dist/sql-asm.js' {
  import type { SqlJsStatic } from 'sql.js';
  export default function initSqlJs(config?: object): Promise<SqlJsStatic>;
}
