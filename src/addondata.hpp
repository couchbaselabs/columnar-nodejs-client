#pragma once
#include <napi.h>

namespace couchnode
{

class AddonData
{
public:
  static inline void Init(Napi::Env env, Napi::Object exports)
  {
    env.SetInstanceData(new AddonData());
  }

  static inline AddonData* fromEnv(Napi::Env& env)
  {
    return env.GetInstanceData<AddonData>();
  }

  Napi::FunctionReference _connectionCtor;
  Napi::FunctionReference _queryResultCtor;
};

} // namespace couchnode
