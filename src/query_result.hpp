#pragma once

#include "addondata.hpp"
#include "napi.h"
#include <core/columnar/query_result.hxx>

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

  Napi::Value jsNextRow(const Napi::CallbackInfo& info);
  Napi::Value jsCancel(const Napi::CallbackInfo& info);
  Napi::Value jsMetadata(const Napi::CallbackInfo& info);

private:
  std::shared_ptr<couchbase::core::columnar::query_result> result_;
};
} // namespace couchnode
