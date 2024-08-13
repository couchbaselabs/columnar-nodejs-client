import { QueryScanConsistency } from './querytypes'
import binding, {
  CppColumnarError,
  CppColumnarQueryScanConsistency,
  CppColumnarQueryErrorProperties,
} from './binding'
import * as errs from './errors'

/**
 * @internal
 */
export function queryScanConsistencyToCpp(
  mode: QueryScanConsistency | undefined
): CppColumnarQueryScanConsistency | undefined {
  if (!mode) {
    return undefined
  }

  if (mode === QueryScanConsistency.NotBounded) {
    return binding.columnar_query_scan_consistency.not_bounded
  } else if (mode === QueryScanConsistency.RequestPlus) {
    return binding.columnar_query_scan_consistency.request_plus
  }

  throw new Error('Invalid query scan consistency provided')
}

/**
 * @internal
 */
export function errorFromCpp(err: CppColumnarError | null): Error | null {
  if (!err) {
    return null
  }

  switch (err.code) {
    case binding.columnar_errc.generic:
      return new errs.ColumnarError(err.message_and_ctx)
    case binding.columnar_errc.invalid_credential:
      return new errs.InvalidCredentialError(err.message_and_ctx)
    case binding.columnar_errc.timeout:
      return new errs.TimeoutError(err.message_and_ctx)
    case binding.columnar_errc.query_error: {
      const queryErrorProperties =
        err.query_error_properties as CppColumnarQueryErrorProperties // Should always be set on a query_error
      return new errs.QueryError(
        err.message_and_ctx,
        queryErrorProperties.server_message,
        queryErrorProperties.code
      )
    }
    default:
      return new errs.ColumnarError(err.message_and_ctx)
  }
}
