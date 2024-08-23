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

template<typename T, typename Enabled = void>
struct js_to_cbpp_t;

template<typename T>
static inline T
js_to_cbpp(Napi::Value jsVal)
{
  return js_to_cbpp_t<T>::from_js(jsVal);
}

template<typename T>
static inline void
js_to_cbpp(T& cppObj, Napi::Value jsVal)
{
  cppObj = js_to_cbpp_t<T>::from_js(jsVal);
}

template<typename T>
static inline Napi::Value
cbpp_to_js(Napi::Env env, const T& cppObj)
{
  return js_to_cbpp_t<T>::to_js(env, cppObj);
}

template<typename T>
static inline T
jsToCbpp(Napi::Value jsVal)
{
  return js_to_cbpp_t<T>::from_js(jsVal);
}

template<typename T>
Napi::Value
cbppToJs(Napi::Env env, const T& cppObj)
{
  return js_to_cbpp_t<T>::to_js(env, cppObj);
}

} // namespace couchnode
