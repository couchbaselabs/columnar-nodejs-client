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
