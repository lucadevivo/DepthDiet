/** Una migrazione = uno step versionato di evoluzione dello schema. */
export interface Migration {
  /** Numero progressivo, univoco e crescente (1, 2, 3, ...). */
  version: number;
  /** Etichetta leggibile, solo a scopo log. */
  name: string;
  /** SQL applicato dentro a una transazione. */
  sql: string;
}
