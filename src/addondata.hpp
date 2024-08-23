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
