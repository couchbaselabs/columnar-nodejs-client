/**
 * A generic base error that all non-platform errors inherit.  Exposes the cause and
 * context of the error to enable easier debugging.
 *
 * @category Error Handling
 */
export class ColumnarError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Indicates that the user credentials are incorrect.
 *
 * @category Error Handling
 */
export class InvalidCredentialError extends ColumnarError {
  constructor(message: string) {
    super(message)
  }
}

/**
 * Indicates that an interaction with the Columnar cluster does not complete before its timeout expires.
 *
 * @category Error Handling
 */
export class TimeoutError extends ColumnarError {
  constructor(message: string) {
    super(message)
  }
}

/**
 * Indicates that the Columnar cluster returned an error message in response to a query request.
 *
 * @category Error Handling
 */
export class QueryError extends ColumnarError {
  /**
   * A human-readable error message sent by the server, without the additional context contained in {@link Error.message}.
   */
  serverMessage: string

  // TODO: Add docs reference link with error codes
  /**
   * The Columnar error code sent by the server.
   */
  code: number

  constructor(message: string, serverMessage: string, code: number) {
    super(message)
    this.serverMessage = serverMessage
    this.code = code
  }
}
