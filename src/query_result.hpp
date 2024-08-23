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

#pragma once

#include "addondata.hpp"
#include "napi.h"
#include <core/columnar/query_result.hxx>
#include <core/pending_operation.hxx>

namespace couchnode
{
class QueryResult : public Napi::ObjectWrap<QueryResult>
{
public:
  static Napi::FunctionReference& constructor(Napi::Env env)
  {
    return AddonData::fromEnv(env)->_queryResultCtor;
  }

  static void Init(Napi::Env env, Napi::Object exports);

  QueryResult(const Napi::CallbackInfo& info);
  ~QueryResult();

  void setPendingOp(std::shared_ptr<couchbase::core::pending_operation> pending_op);
  void setQueryResult(couchbase::core::columnar::query_result query_result);

  Napi::Value jsNextRow(const Napi::CallbackInfo& info);
  Napi::Value jsCancel(const Napi::CallbackInfo& info);
  Napi::Value jsMetadata(const Napi::CallbackInfo& info);

private:
  std::shared_ptr<couchbase::core::pending_operation> pending_op_;
  std::shared_ptr<couchbase::core::columnar::query_result> result_;
};
} // namespace couchnode
