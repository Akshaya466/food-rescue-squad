export class SparkUnavailableError extends Error {
  constructor(operation: string) {
    super(
      `${operation} is unavailable in this Spark-only deployment because it requires a trusted Cloud Functions backend. No data was changed.`
    );
    this.name = "SparkUnavailableError";
  }
}

export function throwSparkUnavailable(operation: string): never {
  throw new SparkUnavailableError(operation);
}
