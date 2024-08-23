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

#include "instance.hpp"

namespace couchnode
{

Instance::Instance()
  : _cluster(couchbase::core::cluster(_io))
  , _agent(couchbase::core::columnar::agent(_io, { { _cluster } }))
{
  _ioThread = std::thread([this]() {
    try {
      _io.run();
    } catch (const std::exception& e) {
      CB_LOG_ERROR(e.what());
      throw;
    } catch (...) {
      CB_LOG_ERROR("Unknown exception");
      throw;
    }
  });
}

Instance::~Instance()
{
}

void
Instance::asyncDestroy()
{
  _cluster.close([this]() mutable {
    // We have to run this on a separate thread since the callback itself is
    // actually running from within the io context.
    std::thread([this]() {
      _ioThread.join();
      delete this;
    }).detach();
  });
}

} // namespace couchnode
