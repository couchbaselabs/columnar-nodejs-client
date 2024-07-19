#pragma once
#include "jstocbpp_defs.hpp"

#include "jstocbpp_basic.hpp"
#include "jstocbpp_cpptypes.hpp"

#include <core/cluster.hxx>
#include <core/columnar/error.hxx>
#include <core/operations/management/error_utils.hxx>
#include <core/utils/json.hxx>

namespace couchnode
{

template<>
struct js_to_cbpp_t<std::exception> {
  static inline Napi::Value to_js(Napi::Env env, const std::exception& except)
  {
    Napi::Error err = Napi::Error::New(env, except.what());
    return err.Value();
  }
};

template<>
struct js_to_cbpp_t<std::error_code> {
  static inline Napi::Value to_js(Napi::Env env, const std::error_code& ec)
  {
    if (!ec) {
      return env.Null();
    }

    Napi::Error err = Napi::Error::New(env, ec.message());
    err.Set("code", Napi::Number::New(env, ec.value()));
    return err.Value();
  }

  static inline std::error_code from_js(Napi::Value jsVal)
  {
    throw Napi::Error::New(jsVal.Env(), "invalid std::error_code marshal from js");
  }
};

template<>
struct js_to_cbpp_t<couchbase::core::columnar::error> {
  static inline Napi::Value to_js(Napi::Env env, const couchbase::core::columnar::error& error)
  {
    if (!error.ec) {
      return env.Null();
    }

    Napi::Error err = Napi::Error::New(env, error.ec.message());
    err.Set("code", cbpp_to_js(env, error.ec.value()));
    err.Set("message", cbpp_to_js(env, error.message));

    err.Set("ctx", Napi::String::New(env, couchbase::core::utils::json::generate(error.ctx)));
    err.Set("message_and_ctx", Napi::String::New(env, error.message_with_ctx()));

    if (std::holds_alternative<couchbase::core::columnar::query_error_properties>(
          error.properties)) {
      auto err_properties =
        std::get<couchbase::core::columnar::query_error_properties>(error.properties);
      err.Set("query_error_properties", cbpp_to_js(env, err_properties));
    }
    return err.Value();
  }
};

template<>
struct js_to_cbpp_t<couchbase::core::error_context::analytics> {
  static inline Napi::Value to_js(Napi::Env env,
                                  const couchbase::core::error_context::analytics& ctx)
  {
    if (!ctx.ec) {
      return env.Null();
    }

    auto ec = ctx.ec;
    if (ec) {
      auto maybeEc = couchbase::core::operations::management::translate_analytics_error_code(
        ctx.first_error_code, ctx.first_error_message);
      if (maybeEc.has_value()) {
        ec = maybeEc.value();
      }
    }

    Napi::Error err = Napi::Error::New(env, ec.message());
    err.Set("ctxtype", Napi::String::New(env, "analytics"));
    err.Set("code", cbpp_to_js(env, ec.value()));

    err.Set("first_error_code", cbpp_to_js(env, ctx.first_error_code));
    err.Set("first_error_message", cbpp_to_js(env, ctx.first_error_message));
    err.Set("client_context_id", cbpp_to_js(env, ctx.client_context_id));
    err.Set("statement", cbpp_to_js(env, ctx.statement));
    err.Set("parameters", cbpp_to_js(env, ctx.parameters));

    err.Set("method", cbpp_to_js(env, ctx.method));
    err.Set("path", cbpp_to_js(env, ctx.path));
    err.Set("http_status", cbpp_to_js(env, ctx.http_status));
    err.Set("http_body", cbpp_to_js(env, ctx.http_body));

    err.Set("last_dispatched_to", cbpp_to_js(env, ctx.last_dispatched_to));
    err.Set("last_dispatched_from", cbpp_to_js(env, ctx.last_dispatched_from));
    err.Set("retry_attempts", cbpp_to_js(env, ctx.retry_attempts));
    err.Set("retry_reasons", cbpp_to_js(env, ctx.retry_reasons));
    return err.Value();
  }
};

template<>
struct js_to_cbpp_t<couchbase::core::error_context::http> {
  static inline Napi::Value to_js(Napi::Env env, const couchbase::core::error_context::http& ctx)
  {
    if (!ctx.ec) {
      return env.Null();
    }

    Napi::Error err = Napi::Error::New(env, ctx.ec.message());
    err.Set("ctxtype", Napi::String::New(env, "http"));
    err.Set("code", cbpp_to_js(env, ctx.ec.value()));

    err.Set("client_context_id", cbpp_to_js(env, ctx.client_context_id));
    err.Set("method", cbpp_to_js(env, ctx.method));
    err.Set("path", cbpp_to_js(env, ctx.path));
    err.Set("http_status", cbpp_to_js(env, ctx.http_status));
    err.Set("http_body", cbpp_to_js(env, ctx.http_body));

    err.Set("last_dispatched_to", cbpp_to_js(env, ctx.last_dispatched_to));
    err.Set("last_dispatched_from", cbpp_to_js(env, ctx.last_dispatched_from));
    err.Set("retry_attempts", cbpp_to_js(env, ctx.retry_attempts));
    err.Set("retry_reasons", cbpp_to_js(env, ctx.retry_reasons));
    return err.Value();
  }
};

} // namespace couchnode
