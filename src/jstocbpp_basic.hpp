#pragma once
#include "jstocbpp_cpptypes.hpp"
#include "jstocbpp_defs.hpp"

#include <core/cluster.hxx>
#include <core/columnar/security_options.hxx>
#include <core/document_id.hxx>
#include <core/json_string.hxx>
#include <core/management/eventing_function.hxx>
#include <core/query_context.hxx>

namespace couchnode
{

template<>
struct js_to_cbpp_t<couchbase::core::json_string> {
  static inline Napi::Value to_js(Napi::Env env, const couchbase::core::json_string& cppObj)
  {
    return js_to_cbpp_t<std::string>::to_js(env, cppObj.str());
  }

  static inline couchbase::core::json_string from_js(Napi::Value jsVal)
  {
    auto str = js_to_cbpp_t<std::string>::from_js(jsVal);
    return couchbase::core::json_string(std::move(str));
  }
};

template<>
struct js_to_cbpp_t<couchbase::core::cluster_credentials> {
  static inline couchbase::core::cluster_credentials from_js(Napi::Value jsVal)
  {
    auto jsObj = jsVal.ToObject();
    couchbase::core::cluster_credentials cppObj;
    js_to_cbpp(cppObj.username, jsObj.Get("username"));
    js_to_cbpp(cppObj.password, jsObj.Get("password"));
    js_to_cbpp(cppObj.certificate_path, jsObj.Get("certificate_path"));
    js_to_cbpp(cppObj.key_path, jsObj.Get("key_path"));
    js_to_cbpp(cppObj.allowed_sasl_mechanisms, jsObj.Get("allowed_sasl_mechanisms"));
    return cppObj;
  }
};

template<>
struct js_to_cbpp_t<couchbase::core::columnar::security_options> {
  static inline couchbase::core::columnar::security_options from_js(Napi::Value jsVal)
  {
    auto jsObj = jsVal.ToObject();
    couchbase::core::columnar::security_options cppObj;
    js_to_cbpp(cppObj.trust_only_capella, jsObj.Get("trustOnlyCapella"));
    js_to_cbpp(cppObj.trust_only_pem_file, jsObj.Get("trustOnlyPemFile"));
    js_to_cbpp(cppObj.trust_only_pem_string, jsObj.Get("trustOnlyPemString"));
    js_to_cbpp(cppObj.trust_only_platform, jsObj.Get("trustOnlyPlatform"));
    js_to_cbpp(cppObj.trust_only_certificates, jsObj.Get("trustOnlyCertificates"));
    js_to_cbpp(cppObj.cipher_suites, jsObj.Get("cipherSuites"));
    return cppObj;
  }
};

template<>
struct js_to_cbpp_t<couchbase::core::io::dns::dns_config> {
  static inline couchbase::core::io::dns::dns_config from_js(Napi::Value jsVal)
  {
    auto jsObj = jsVal.ToObject();
    auto cppObj = couchbase::core::io::dns::dns_config{
      js_to_cbpp<std::string>(jsObj.Get("nameserver")),
      js_to_cbpp<std::uint16_t>(jsObj.Get("port")),
      js_to_cbpp<std::chrono::milliseconds>(jsObj.Get("dnsSrvTimeout"))
    };
    return cppObj;
  }
};

} // namespace couchnode
