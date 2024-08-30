/*
 *  Copyright 2016-2024. Couchbase, Inc.
 *  All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

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

  // TODO:  handle other client_errc
  if (err.client_err_code && err.client_err_code === 'canceled') {
    return new errs.OperationCanceledError(err.message_and_ctx)
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
