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
}

QueryResult::~QueryResult()
{
}

void
QueryResult::setPendingOp(std::shared_ptr<couchbase::core::pending_operation> pending_op)
{
  this->pending_op_ = pending_op;
}

void
QueryResult::setQueryResult(couchbase::core::columnar::query_result query_result)
{
  this->result_.reset();
  this->result_ = std::make_shared<couchbase::core::columnar::query_result>(query_result);
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
  bool okay = true;
  if (this->pending_op_ && !this->result_) {
    this->pending_op_->cancel();
  } else if (this->result_) {
    this->result_->cancel();
  } else {
    okay = false;
  }
  return Napi::Boolean::New(env, okay);
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
