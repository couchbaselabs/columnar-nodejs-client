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
#include <asio/io_context.hpp>
#include <core/cluster.hxx>
#include <core/columnar/agent.hxx>
#include <core/logger/logger.hxx>
#include <memory>
#include <thread>

namespace couchnode
{

class Instance
{
private:
  ~Instance();

public:
  Instance(couchbase::core::columnar::timeout_config timeout_config);

  void asyncDestroy();

  asio::io_context _io;
  std::thread _ioThread;
  couchbase::core::cluster _cluster;
  couchbase::core::columnar::agent _agent;
};

} // namespace couchnode
