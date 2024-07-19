#include "query_result.hpp"
#include "connection.hpp"
#include "jstocbpp.hpp"

namespace couchnode
{
using result_variant = std::variant<std::monostate,
                                    couchbase::core::columnar::query_result_row,
                                    couchbase::core::columnar::query_result_end>;

void
QueryResult::Init(Napi::Env env, Napi::Object exports)
{
  Napi::Function func = DefineClass(env,
                                    "QueryResult",
                                    {
                                      InstanceMethod<&QueryResult::jsNextRow>("nextRow"),
                                      InstanceMethod<&QueryResult::jsCancel>("cancel"),
                                      InstanceMethod<&QueryResult::jsMetadata>("metadata"),
                                    });

  constructor(env) = Napi::Persistent(func);

  exports.Set("QueryResult", func);
}

QueryResult::QueryResult(const Napi::CallbackInfo& info)
  : Napi::ObjectWrap<QueryResult>(info)
{
  if (info.Length() > 0) {
    auto wrapped_result =
      *info[0].As<const Napi::External<couchbase::core::columnar::query_result>>().Data();
    this->result_ = std::make_shared<couchbase::core::columnar::query_result>(wrapped_result);
  }
}

QueryResult::~QueryResult()
{
}

Napi::Value
QueryResult::jsNextRow(const Napi::CallbackInfo& info)
{
  auto env = info.Env();
  auto callbackJsFn = info[0].As<Napi::Function>();
  auto cookie = CallCookie(env, callbackJsFn, "cbQueryNextRow");

  auto handler = [](Napi::Env env,
                    Napi::Function callback,
                    result_variant resp,
                    couchbase::core::columnar::error err) mutable {
    Napi::Value jsErr, jsRes;

    try {
      if (std::holds_alternative<couchbase::core::columnar::query_result_end>(resp)) {
        jsErr = env.Null();
        jsRes = env.Undefined();
      } else if (std::holds_alternative<couchbase::core::columnar::query_result_row>(resp)) {
        auto row = std::get<couchbase::core::columnar::query_result_row>(resp);
        jsErr = cbpp_to_js(env, err);
        jsRes = cbpp_to_js(env, row.content);
      } else { // std::monostate on error
        jsErr = cbpp_to_js(env, err);
        jsRes = env.Null();
      }
    } catch (const Napi::Error& e) {
      jsErr = e.Value();
      jsRes = env.Null();
    }

    callback.Call({ jsRes, jsErr });
  };

  this->result_->next_row([cookie = std::move(cookie), handler = std::move(handler)](
                            result_variant resp, couchbase::core::columnar::error err) mutable {
    cookie.invoke([handler = std::move(handler), resp = std::move(resp), err = std::move(err)](
                    Napi::Env env, Napi::Function callback) mutable {
      handler(env, callback, std::move(resp), std::move(err));
    });
  });
  return env.Null();
}

Napi::Value
QueryResult::jsCancel(const Napi::CallbackInfo& info)
{
  auto env = info.Env();
  this->result_->cancel();
  return Napi::Boolean::New(env, true);
}

Napi::Value
QueryResult::jsMetadata(const Napi::CallbackInfo& info)
{
  auto env = info.Env();

  Napi::Value jsErr, jsRes;

  auto metadata = this->result_->metadata();
  if (metadata.has_value()) {
    try {
      jsRes = cbpp_to_js(env, metadata.value());
      jsErr = env.Null();
      return jsRes;
    } catch (const Napi::Error& e) {
      return e.Value();
    }
  }
  return env.Null();
}
} // namespace couchnode
