import json
import os
import pathlib
import re
import subprocess
import sys

from functools import reduce
from typing import (Dict, List, Optional, Tuple)

import clang.cindex

# START CONFIGURATION

CXX_CLIENT_ROOT = os.path.join(pathlib.Path(__file__).parent.parent, 'deps', 'couchbase-cxx-client')
CXX_CLIENT_CACHE = os.path.join(pathlib.Path(__file__).parent.parent, 'deps', 'couchbase-cxx-cache')

CXX_DEPS_INCLUDE_PATHS = {
    'asio': ['-I{0}/asio/{1}/asio/asio/include'],
    'fmt': ['-I{0}/fmt/{1}/fmt/include'],
    'gsl': ['-I{0}/gsl/{1}/gsl/include'],
    'json': ['-I{0}/json/{1}/json/include',
             '-I{0}/json/{1}/json/external/PEGTL/include'
             ],
}

FILE_LIST = [
    "couchbase/retry_reason.hxx",
    "core/json_string.hxx",
    "core/columnar/query_options.hxx",
    "core/columnar/query_result.hxx",
    "core/columnar/error.hxx",
    "core/columnar/error_codes.hxx"
]

TYPE_LIST = [
    "couchbase::retry_reason",
    "couchbase::core::json_string",
    "couchbase::core::columnar::query_options",
    "couchbase::core::columnar::query_scan_consistency",
    "couchbase::core::columnar::query_metadata",
    "couchbase::core::columnar::query_warning",
    "couchbase::core::columnar::query_metrics",
    "couchbase::core::columnar::query_error_properties",
    "couchbase::core::columnar::errc",
]

STD_COMPARATOR_TEMPLATES = ["std::less<{0}>", "std::greater<{0}>", "std::less_equal<{0}>", "std::greater_equal<{0}>"]
# flatten the list of lists
STD_COMPARATORS = list(reduce(lambda a, b: a + b,
                              list(map(lambda c: [c.format(s) for s in ['', 'void']], STD_COMPARATOR_TEMPLATES)),
                              []))

INTERNAL_STRUCTS = []
UNNAMED_STRUCT_DELIM = '::(unnamed struct'

# END - CONFIGURATION


class BindingsGenerator:

    def __init__(self,
                 llvm_clang_version: Optional[str]=None,
                 llvm_libdir: Optional[str]=None,
                 llvm_includedir: Optional[str]=None,
                 system_headers: Optional[str]=None,
                 verbose: Optional[bool]=False) -> None:
        self._op_types = []
        self._op_enums = []
        self._full_file_list = []
        # generate a list of regexps from the type list (for handling wildcards)
        self._type_list_re = list(map(lambda x: x.replace("*", "(.*)") + "(.*)", TYPE_LIST))
        self._verbose = verbose
        self.configure_generator(llvm_clang_version, llvm_libdir, llvm_includedir, system_headers)

    def configure_generator(self,
                            version: Optional[str]=None,
                            libdir: Optional[str]=None,
                            includedir: Optional[str]=None,
                            system_headers: Optional[str]=None) -> None:
        if version is None:
            version = os.environ.get('CN_LLVM_VERSION')
        if version is None:
            BindingsGenerator.find_llvm()
            version = BindingsGenerator.get_llvm_version()
        if version is None:
            raise ValueError('Missing LLVM version.')

        if includedir is None:
            includedir = os.environ.get('CN_LLVM_INCLUDE')
        if includedir is None:
            includedir = BindingsGenerator.get_llvm_includedir()
        if includedir is None:
            raise ValueError('Missing LLVM include directory.')

        if libdir is None:
            libdir = os.environ.get('CN_LLVM_LIB')
        if libdir is None:
            libdir = BindingsGenerator.get_llvm_libdir()
        if libdir is None:
            raise ValueError('Missing LLVM lib directory.')
        
        if system_headers is None:
            system_headers = os.environ.get('CN_SYS_HEADERS')
        if system_headers is None:
            system_headers = BindingsGenerator.get_system_headers()
        if system_headers is None:
            raise ValueError('Missing system headers path.')
        
        if self._verbose:
            print(f'Using libdir={libdir}')
        clang.cindex.Config.set_library_path(libdir)

        self._include_paths = [
            '-I/opt/homebrew/opt/llvm/include/c++/v1',
            f'-I{CXX_CLIENT_ROOT}/',
            f'-I/opt/homebrew/Cellar/llvm/{version}/lib/clang/{version[:2]}/include',
            f'-I{system_headers}/usr/include'
        ]

        for dep, inc in CXX_DEPS_INCLUDE_PATHS.items():
            self._include_paths.extend(BindingsGenerator.set_cxx_deps_include_paths(dep, inc))

        if self._verbose:
            print(f'Include paths={self._include_paths}')

        self.set_file_list()

    def gen_bindings(self) -> None:

        for headerPath in self._full_file_list:
            print("processing " + headerPath)
            index = clang.cindex.Index.create()
            if self._verbose is True:
                args = ['-std=c++17', '-v', f'-isysroot{os.getcwd()}'] + self._include_paths
            else:
                args = ['-std=c++17', f'-isysroot{os.getcwd()}'] + self._include_paths
            translation_unit = index.parse(headerPath, args=args)

            # output clang compiler diagnostics information (for debugging)
            if 1:
                for diagnostic in translation_unit.diagnostics:
                    diagnosticMsg = diagnostic.format()
                    print(diagnostic)

            
            self.traverse(translation_unit.cursor, [], headerPath)

        jsonData = json.dumps({
            'op_structs': self._op_types,
            'op_enums': self._op_enums
        })

        f = open("bindings.json", "w")
        f.write(jsonData)
        f.close()

    def set_file_list(self) -> None:
        for file_path in FILE_LIST:
            if "*" in file_path:
                # wildcard path
                basePath = file_path[:-1]
                if "*" in basePath:
                    # if there is still a wildcard, we have an issue...
                    raise NotImplementedError(
                        "wildcard only supported at end of file path")
                if basePath[-1] != os.path.sep:
                    tokens = basePath.split(os.path.sep)
                    # filter = tokens[-1]
                    files = BindingsGenerator.list_headers_in_dir(os.path.join(CXX_CLIENT_ROOT, *tokens[:-1]),
                                                                  tokens[-1])
                else:
                    files = BindingsGenerator.list_headers_in_dir(os.path.join(CXX_CLIENT_ROOT, basePath))
                self._full_file_list = self._full_file_list + files
            else:
                # normal path
                self._full_file_list.append(os.path.join(CXX_CLIENT_ROOT, file_path))

        # exclude _json.hxx files
        self._full_file_list = list(filter(lambda x: not x.endswith('_json.hxx'), self._full_file_list))
        # exclude _fmt.hxx files
        self._full_file_list = list(filter(lambda x: not x.endswith('_fmt.hxx'), self._full_file_list))

    def traverse(self, node, namespace, main_file) -> None:
        # only scan the elements of the file we parsed
        if node.location.file != None and node.location.file.name != main_file:
            return

        if node.kind == clang.cindex.CursorKind.STRUCT_DECL or node.kind == clang.cindex.CursorKind.CLASS_DECL:
            full_struct_name = "::".join([*namespace, node.displayname])
            if full_struct_name.endswith('::') or UNNAMED_STRUCT_DELIM in full_struct_name:
                if full_struct_name.endswith('::'):
                    struct_name = full_struct_name
                else:
                    struct_name = full_struct_name.split(UNNAMED_STRUCT_DELIM)[0]
                match = next((s for s in INTERNAL_STRUCTS if struct_name in s), None)
                if match:
                    full_struct_name = match

            if (BindingsGenerator.is_included_type(full_struct_name, self._type_list_re)
                or full_struct_name in INTERNAL_STRUCTS):
                struct_fields = []
                for child in node.get_children():
                    if child.kind == clang.cindex.CursorKind.FIELD_DECL:
                        struct_type = BindingsGenerator.parse_type(child.type)
                        type_str = child.type.get_canonical().spelling
                        if 'unnamed' in type_str:
                            name_tokens = type_str.split('::')
                            name_override = '::'.join(name_tokens[:-1] + [child.displayname])
                            struct_type['name'] = name_override
                            INTERNAL_STRUCTS.append(name_override)

                        struct_fields.append({
                            "name": child.displayname,
                            "type": struct_type,
                        })
                # replica read changes introduced duplicate get requests
                if any(map(lambda op: op['name'] == full_struct_name, self._op_types)):
                    return

                self._op_types.append({
                    "name": full_struct_name,
                    "fields": struct_fields,
                })
        if node.kind == clang.cindex.CursorKind.TYPE_ALIAS_DECL:
            full_struct_name = "::".join([*namespace, node.displayname])
            if BindingsGenerator.is_included_type(full_struct_name, self._type_list_re, with_durability=True):
                type_ref = next((c for c in node.get_children() if c.kind == clang.cindex.CursorKind.TYPE_REF), None)
                if type_ref:
                    base_request_name = type_ref.displayname.replace('struct', '').strip()
                    base_request = next((op for op in self._op_types if op['name'] == base_request_name), None)
                    if base_request:
                        new_fields = [f for f in base_request['fields'] if f['name'] != 'durability_level']
                        new_fields.extend([
                                {"name":"persist_to", "type":{"name":"couchbase::persist_to"}},
                                {"name":"replicate_to", "type":{"name":"couchbase::replicate_to"}}
                            ])

                        self._op_types.append({
                            "name": full_struct_name,
                            "fields": new_fields
                        })
        if node.kind == clang.cindex.CursorKind.ENUM_DECL:
            full_enum_name = "::".join([*namespace, node.displayname])
            if BindingsGenerator.is_included_type(full_enum_name, self._type_list_re):
                enumValues = []

                for child in node.get_children():
                    if child.kind == clang.cindex.CursorKind.ENUM_CONSTANT_DECL:
                        enumValues.append({
                            "name": child.displayname,
                            "value": child.enum_value,
                        })
                self._op_enums.append({
                    "name": full_enum_name,
                    "type": BindingsGenerator.parse_type(node.enum_type),
                    "values": enumValues,
                })

        if node.kind == clang.cindex.CursorKind.NAMESPACE:
            namespace = [*namespace, node.displayname]
        if node.kind == clang.cindex.CursorKind.CLASS_DECL:
            namespace = [*namespace, node.displayname]
        if node.kind == clang.cindex.CursorKind.STRUCT_DECL:
            namespace = [*namespace, node.displayname]

        for child in node.get_children():
            self.traverse(child, namespace, main_file)

    @staticmethod
    def set_cxx_deps_include_paths(dep, includes):
        cpm_path = os.path.join(CXX_CLIENT_CACHE, dep)
        dir_pattern = r'[0-9a-z]{40}'
        cpm_hash_dir = next((d for d in os.listdir(cpm_path)
                            if os.path.isdir(os.path.join(cpm_path, d)) and re.match(dir_pattern, d)),
                            None)
        if not cpm_hash_dir:
            raise Exception(f'Unable to find CPM hash directory for path: {cpm_path}.')
        return list(map(lambda p: p.format(CXX_CLIENT_CACHE, cpm_hash_dir), includes))

    @staticmethod    
    def list_headers_in_dir(path: str, file_startswith: Optional[str]=None) -> List[str]:
        # enumerates a folder but keeps the full pathing for the files returned
        # and removes certain files we don't want (like non-hxx, _json.hxx or _fmt.hxx)

        # list all the files in the folder
        files = os.listdir(path)
        
        if file_startswith is not None:
            files = list(filter(lambda f: f.endswith('.hxx') and f.startswith(file_startswith), files))
            # add the folder path back on
            files = list(map(lambda f: os.path.join(path, f), files))
        else:
            # only include .hxx files
            files = list(filter(lambda f: f.endswith('.hxx'), files))
            # add the folder path back on
            files = list(map(lambda f: path + f, files))
        return files
    
    @staticmethod
    def is_included_type(name: str, type_list_re: List[str], with_durability: Optional[bool]=False) -> bool:

        # TODO(brett19): This should be generalized somehow...
        if "is_compound_operation" in name:
            return False

        if "replica_context" in name:
            return False

        if with_durability is True and '_with_legacy_durability' not in name:
            return False

        for x in type_list_re:
            if re.fullmatch(x, name):
                return True
        return False
    
    @staticmethod
    def parse_type(type_: str) -> str:
        type_str = type_.get_canonical().spelling
        return BindingsGenerator.parse_type_str(type_str)

    @staticmethod    
    def parse_type_str(type_str: str) -> Dict[str, str]:
        if type_str == "std::mutex":
            return {"name": "std::mutex"}
        if type_str == "std::string":
            return {"name": "std::string"}
        if type_str == "std::chrono::duration<long long>":
            return {"name": "std::chrono::seconds"}
        if type_str == "std::chrono::duration<long long, std::ratio<1, 1000>>":
            return {"name": "std::chrono::milliseconds"}
        if type_str == "std::chrono::duration<long long, std::ratio<1, 1000000>>":
            return {"name": "std::chrono::microseconds"}
        if type_str == "std::chrono::duration<long long, std::ratio<1, 1000000000>>":
            return {"name": "std::chrono::nanoseconds"}
        if type_str == "std::error_code":
            return {"name": "std::error_code"}
        if type_str == "std::monostate":
            return {"name": "std::monostate"}
        if type_str == "std::byte":
            return {"name": "std::byte"}
        if type_str == "unsigned long":
            return {"name": "std::size_t"}
        if type_str == "char":
            return {"name": "std::int8_t"}
        if type_str == "unsigned char":
            return {"name": "std::uint8_t"}
        if type_str == "short":
            return {"name": "std::int16_t"}
        if type_str == "unsigned short":
            return {"name": "std::uint16_t"}
        if type_str == "int":
            return {"name": "std::int32_t"}
        if type_str == "unsigned int":
            return {"name": "std::uint32_t"}
        if type_str == "long long":
            return {"name": "std::int64_t"}
        if type_str == "unsigned long long":
            return {"name": "std::uint64_t"}
        if type_str == "bool":
            return {"name": "std::bool"}
        if type_str == "float":
            return {"name": "std::float"}
        if type_str == "double":
            return {"name": "std::double"}
        if type_str == "std::nullptr_t":
            return {"name": "std::nullptr_t"}
        if type_str in STD_COMPARATORS:
            if 'void' in type_str:
                return {"name": type_str.replace("void", "")}
            return {"name": type_str}

        tplParts = type_str.split("<", 1)
        if len(tplParts) > 1:
            tplClassName = tplParts[0]
            tplParams = tplParts[1][:-1]
            if tplClassName == "std::function":
                return {
                    "name": "std::function"
                }
            if tplClassName == "std::optional":
                return {
                    "name": "std::optional",
                    "of": BindingsGenerator.parse_type_str(tplParams)
                }
            if tplClassName == "std::vector":
                return {
                    "name": "std::vector",
                    "of": BindingsGenerator.parse_type_str(tplParams)
                }
            if tplClassName == "std::set":
                return {
                    "name": "std::set",
                    "of": BindingsGenerator. parse_type_str(tplParams)
                }
            if tplClassName == "std::variant":
                variantParts = tplParams.split(", ")
                variantTypes = []
                for variantPart in variantParts:
                    variantTypes.append(BindingsGenerator.parse_type_str(variantPart))
                return {
                    "name": "std::variant",
                    "of": variantTypes
                }
            if tplClassName == "std::array":
                variantParts = tplParams.split(", ")
                if len(variantParts) != 2:
                    print("FAILED TO PARSE ARRAY TYPES: " + type_str)
                    return {"name": "unknown", "str": type_str}
                return {
                    "name": "std::array",
                    "of": BindingsGenerator.parse_type_str(variantParts[0]),
                    "size": int(variantParts[1])
                }
            if tplClassName == "std::map":
                variantParts = tplParams.split(", ")
                if len(variantParts) < 2 or len(variantParts) > 3:
                    print("FAILED TO PARSE MAP TYPES: " + type_str)
                    return {"name": "unknown", "str": type_str}

                if len(variantParts) == 2:
                    return {
                        "name": "std::map",
                        "of": BindingsGenerator.parse_type_str(variantParts[0]),
                        "to": BindingsGenerator.parse_type_str(variantParts[1])
                    }
                else:
                    return {
                        "name": "std::map",
                        "of": BindingsGenerator.parse_type_str(variantParts[0]),
                        "to": BindingsGenerator.parse_type_str(variantParts[1]),
                        "comparator": BindingsGenerator.parse_type_str(variantParts[2])
                    }

            if tplClassName == "std::shared_ptr":
                return {
                    "name": "std::shared_ptr",
                    "of": BindingsGenerator.parse_type_str(tplParams)
                }

        if not type_str.startswith("couchbase::"):
            print("FAILED TO PARSE STRING TYPE: " + type_str)
            return {"name": "unknown", "str": type_str}

        if 'unnamed struct' in type_str:
            print("WARNING:  Found unnamed struct: " + type_str)

        return {"name": type_str}


    @staticmethod
    def sh(command: str, piped: Optional[bool]=False) -> Tuple[str, int]:
        try:
            if piped is True:
                proc = subprocess.Popen(command,
                                        stdin=subprocess.PIPE,
                                        stdout=subprocess.PIPE,
                                        stderr=subprocess.PIPE,
                                        shell=True)
            else:
                proc = subprocess.Popen(command,
                                        stdout=subprocess.PIPE,
                                        stderr=subprocess.PIPE,
                                        shell=True)
            stdout, stderr = proc.communicate()
            stderr = stderr.decode('utf-8')
            if stderr != '':
                return stderr, 1
            return stdout.decode('utf-8'), 0
        except FileNotFoundError:
            return "Error: Command not found.", 1

    @staticmethod
    def find_llvm() -> None:
        if sys.platform == 'darwin':
            output, err = BindingsGenerator.sh('which clang')
            if err:
                raise Exception(f'Unable to determine clang binary. Error code: {err}.')
            if 'llvm' not in output.strip():
                # TODO: aarch64 v. x86_64
                os_path = os.environ.get('PATH').split(':')
                os_path = ['/opt/homebrew/opt/llvm/bin'] + os_path                
                os.environ.update(**{'PATH': ':'.join(os_path)})
            output, err = BindingsGenerator.sh('which clang')
            if err:
                raise Exception(f'Unable to determine clang binary. Error code: {err}.')
            if 'llvm' not in output.strip():
                raise Exception('Unable to set LLVM as default.')
        elif sys.platform == 'linux':
            print('Under construction')
        else:
            raise ValueError('Unsupported platform')
        
    @staticmethod
    def get_llvm_version() -> str:
        output, err = BindingsGenerator.sh('llvm-config --version')
        if err:
            raise Exception(f'Unable to determine LLVM version. Error code: {err}')
        return output.strip()

    @staticmethod
    def get_llvm_includedir() -> str:
        output, err = BindingsGenerator.sh('llvm-config --includedir')
        if err:
            raise Exception(f'Unable to determine LLVM includedir. Error code: {err}')
        return output.strip()

    @staticmethod
    def get_llvm_libdir() -> str:
        output, err = BindingsGenerator.sh('llvm-config --libdir')
        if err:
            raise Exception(f'Unable to determine LLVM libdir. Error code: {err}')
        return output.strip()

    @staticmethod
    def get_system_headers() -> str:
        if sys.platform == 'darwin':
            output, err = BindingsGenerator.sh('xcrun --show-sdk-path')
            if err:
                raise Exception(f'Unable to determine system header path. Error code: {err}.')
            return output.strip()
        elif sys.platform == 'linux':
            print('Under construction')
        else:
            raise ValueError('Unsupported platform')

if __name__ == '__main__':
    from argparse import ArgumentParser
    ap = ArgumentParser(description='Parse git version to PEP-440 version')
    ap.add_argument('-v',
                    '--version',
                    help='Set CN_LLVM_VERSION, or use command: llvm-config --version')
    ap.add_argument('-i',
                    '--includedir',
                    help='Set CN_LLVM_INCLUDE, or use command: llvm-config --includedir')
    ap.add_argument('-l',
                    '--libdir',
                    help='Set CN_LLVM_LIB, or use command: llvm-config --libdir')
    ap.add_argument('-s',
                    '--system-headers',
                    help='SET CN_SYS_HEADERS, or use command: xcrun --show-sdk-path')
    options = ap.parse_args()
    
    generator = BindingsGenerator(options.version,
                                  options.libdir,
                                  options.includedir,
                                  options.system_headers)
    generator.gen_bindings()





"""

https://github.com/llvm/llvm-project/issues/86009

"""