/**
 * Converts query result row into an object or value.
 */
export interface Deserializer {
  /**
   * Deserializes raw input into target object.
   *
   * @param encoded The raw input.
   */
  deserialize(encoded: string): any
}

/**
 * The default JsonDeserializer parses the raw input from query into a Javascript value or object.
 */
export class JsonDeserializer implements Deserializer {
  /**
   * Deserializes the raw input into a Javascript value or object.
   *
   * @param encoded The raw input.
   *
   * @throws {SyntaxError} The input must be valid JSON.
   */
  deserialize(encoded: string): any {
    return JSON.parse(encoded)
  }
}

/**
 * The PassthroughDeserializer returns the raw input as received from the server.
 */
export class PassthroughDeserializer implements Deserializer {
  /**
   * Returns the raw input received from the server.
   *
   * @param encoded The raw input.
   */
  deserialize(encoded: string): any {
    return encoded
  }
}
